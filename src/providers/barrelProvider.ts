'use strict';

import { Disposable, window, workspace, OutputChannel, Uri, commands } from 'vscode';
import { EOL } from 'os';
import * as nls from 'vscode-nls';
import * as path from 'path';
import * as fs from 'path';


import * as io from '../libs/io';
import * as editor from '../libs/editor';
import * as template from '../libs/template';
import { BarrelConfig } from '../barrelConfig';
import { SimpleIOResult } from '../models';


const localize = nls.loadMessageBundle();


enum BarrelType {
  All,
  Files,
  Directories
}

export class BarrelProvider {
  private static readonly Commands: { commandId: string; method: any; }[] = [];
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
    return this.createBarrel(uri, BarrelType.All);
  }

  @BarrelProvider.Command('ng42.createFileBarrel')
  @BarrelProvider.CatchErrors
  barrelFiles(uri?: Uri) {
    return this.createBarrel(uri, BarrelType.Files);
  }

  @BarrelProvider.Command('ng42.createDirectoryBarrel')
  @BarrelProvider.CatchErrors
  barrelDirectories(uri?: Uri) {
    return this.createBarrel(uri, BarrelType.Directories);
  }

  @BarrelProvider.CatchErrors
  async createBarrel(uri: Uri, barrelType: BarrelType) {
    if (!uri) throw new Error('No directory selected in the sidebar explorer.');

    const srcPath = uri.fsPath;
    const barrelName = this.options.barrelName;
    const barrelPath = io.getFullPath(srcPath, barrelName);

    if (io.exists(barrelPath)) {
      throw new Error(`${barrelName} already exists at this location.`);
    }

    return this.getArtifacts(srcPath, barrelType)
      .then(artifacts => this.createBody(artifacts))
      .then(body => io.writeFile(barrelPath, body))
      .then(() => editor.showAndOpen(barrelPath))
      .catch((err: Error) => { throw err });
  }

  async getArtifacts(srcPath: string, barrelType: BarrelType): Promise<SimpleIOResult[]> {
    let artifacts: SimpleIOResult[] = [];
    const includes = Object.keys(this.options.include);
    const excludes = Object.keys(this.options.exclude);

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

    return Promise.resolve(artifacts);
  }

  createItem(asset: SimpleIOResult) {
    const assetTemplate = asset.isDirectory ? this.options.directoryTemplate : this.options.fileTemplate;

    const itemTemplate = template.hydrate(assetTemplate, asset.path)
    return itemTemplate;
  }

  createBody(artifacts: SimpleIOResult[]) {
    let contents: string[] = []
    const rendered = artifacts
      .map(art => this.createItem(art));


    if (this.options.useTemplates.header) {
      contents.push(this.options.headerTemplate);
    }

    contents.push(...rendered);

    if (this.options.useTemplates.footer) {
      contents.push(this.options.footerTemplate);
    }

    contents.push(this.options.eol);

    return contents.join(this.options.eol);
  }

}
