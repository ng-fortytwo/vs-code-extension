'use strict';

import { Disposable, window, workspace, OutputChannel, Uri, commands } from 'vscode';
import { EOL } from 'os';
import { keys } from 'ramda';
import { loadMessageBundle } from 'vscode-nls';
import { exists } from 'fs';


import * as io from '../libs/io';
import { hydrateTemplate } from '../libs/template';
import { BarrelConfig } from '../barrelConfig';
import { SimpleIOResult } from '../models';


const localize = loadMessageBundle();

enum BarrelType {
  All,
  Files,
  Directories
};

interface Command {
  commandId: string;
  method: any;
};


export class BarrelProvider {
  private static readonly Commands: Command[] = [];

  private static Command(commandId: string): Function {
    return (target: any, key: string, descriptor: any) => {
      if (!(typeof descriptor.value === 'function')) {
        throw new Error('not supported');
      }

      BarrelProvider.Commands.push({ commandId, method: descriptor.value });
    };
  }

  private static CatchErrors(target: any, key: string, descriptor: any): void {
    if (!(typeof descriptor.value === 'function')) {
      throw new Error('not supported');
    }

    const fn = descriptor.value;

    descriptor.value = function (...args: any[]) {
      fn.apply(this, args).catch(async err => {
        let message: string;

        switch (err.gitErrorCode) {
          // case 'TARGETED_ERROR':
          // 	message = localize('localoization key', "Targeted Error Message");
          // 	break;
          default:
            message = (err.stderr || err.message).replace(/^error: /, '');
            break;
        }

        if (!message) {
          console.error(err);
          return;
        }

        const outputChannel = this.outputChannel as OutputChannel;
        const openOutputChannelChoice = localize('open NG.42 log', "Open NG.42 Log");
        const choice = await window.showErrorMessage(message, openOutputChannelChoice);

        if (choice === openOutputChannelChoice) {
          outputChannel.show();
        }
      });
    };
  }

  private disposables: Disposable[];

  constructor(private options: BarrelConfig, private outputChannel: OutputChannel) {
    this.disposables = BarrelProvider.Commands
      .map(({ commandId, method }) => commands.registerCommand(commandId, method, this));
  }


  dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }

  @BarrelProvider.Command('ng42.createBarrel')
  @BarrelProvider.CatchErrors
  async barrelAll(uri?: Uri) {
    return await this.createBarrel(uri, BarrelType.All, this.options);
  }

  @BarrelProvider.Command('ng42.createFileBarrel')
  @BarrelProvider.CatchErrors
  async barrelFiles(uri?: Uri) {
    return await this.createBarrel(uri, BarrelType.Files, this.options);
  }

  @BarrelProvider.Command('ng42.createDirectoryBarrel')
  @BarrelProvider.CatchErrors
  async barrelDirectories(uri?: Uri) {
    return await this.createBarrel(uri, BarrelType.Directories, this.options);
  }

  async createBarrel(uri: Uri, barrelType: BarrelType, config: BarrelConfig) {
    if (!uri) throw new Error('No directory selected in the sidebar explorer.');

    const srcPath = uri.fsPath;
    const barrelName = config.barrelName;
    const barrelPath = io.getFullPath(srcPath, barrelName);
    const fileExists = io.exists(barrelPath);

    if (fileExists) {
      throw new Error(`${barrelName} already exists at this location.`);
    }

    return await this.getArtifacts(srcPath, barrelType)
      .then(artifacts => {
        const body = this.createBody(artifacts, config);
        io.writeFile(barrelPath, body);
        return true;
      })
      .catch((err: Error) => { throw err });
  }

  async getArtifacts(srcPath: string, barrelType: BarrelType): Promise<SimpleIOResult[]> {
    let artifacts: SimpleIOResult[] = [];
    const includes = keys(this.options.include) as string[];
    const excludes = keys(this.options.exclude) as string[];

    switch (barrelType) {
      case BarrelType.All:

        artifacts.push(...includes
          .reduce<SimpleIOResult[]>((files, glob) => files
            .concat(io.getFiles(srcPath, glob, excludes)), []));

        artifacts.push(...io.getDirectories(srcPath, excludes));

        break;

      case BarrelType.Files:
        artifacts.push(...includes
          .reduce<SimpleIOResult[]>((files, glob) => files
            .concat(io.getFiles(srcPath, glob, excludes)), []));
        break;

      case BarrelType.Directories:
        artifacts.push(...io.getDirectories(srcPath, excludes));
        break;
    }

    return artifacts;
  }


  createItem(asset: SimpleIOResult, config: BarrelConfig) {
    return asset.isDirectory
      ? hydrateTemplate(config.directoryTemplate, asset.path)
      : hydrateTemplate(config.fileTemplate, asset.path);
  }

  headerTemplate(config: BarrelConfig) {
    return config.useTemplates.header
      ? [config.headerTemplate]
      : [];
  }

  footerTemplate(config: BarrelConfig) {
    return config.useTemplates.footer
      ? [config.footerTemplate]
      : [];
  }

  createBody(artifacts: SimpleIOResult[], config: BarrelConfig) {
    const rendered = artifacts
      .map(art => this.createItem(art, config));

    const contents: string[] = [
      ...this.headerTemplate(config),
      ...rendered,
      ...this.footerTemplate(config),
      config.eol
    ];

    return contents.join(config.eol);
  }

}
