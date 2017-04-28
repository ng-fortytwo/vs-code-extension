'use strict';

import { Disposable, window, workspace, OutputChannel, Uri, commands } from 'vscode';
import * as nls from 'vscode-nls';

import * as io from '../libs/io';
import * as editor from '../libs/editor';
import * as template from '../libs/template';
import { EOL } from 'os';


const localize = nls.loadMessageBundle();

let DEBUG: boolean = false;
const BARREL_TEMPLATE = {
  header: '// start:ng42.barrel',
  footer: '// end:ng42.barrel'
};

enum BarrelType {
  All,
  Files,
  Directories
}

interface BarrelSettings {
  barrelName: string;
  itemTemplate: string;
  footerTemplate: string[];
  headerTemplate: string[];
  extensions: string[];
}

const defaultSettings = {
  barrelName: 'index.ts',
  itemTemplate: `export * from './$asset_name';`,
  footerTemplate: [],
  headerTemplate: [],
  extensions: ['.ts']
};


let settings: BarrelSettings;

const CREATE_BARREL = 'ng42.createBarrel';
const CREATE_FILE_BARREL = 'ng42.createFileBarrel';
const CREATE_DIRECTORY_BARREL = 'ng42.createDirectoryBarrel';

interface BarrelerOptions { }

export default class BarrelProvider {
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

  constructor(options: BarrelerOptions, private outputChannel: OutputChannel) {
    this.disposables = BarrelProvider.Commands
      .map(({ commandId, method }) => commands.registerCommand(commandId, method, this));
  }


  activate() {
    settings = this.readSettings();
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

  async createBarrel(uri: Uri, barrelType: BarrelType) {
    if (!uri) return editor.showError('No directory selected in the sidebar explorer.');

    const srcPath = uri.fsPath;
    const barrelName = settings.barrelName;
    const barrelPath = io.getFullPath(srcPath, barrelName);

    if (io.exists(barrelPath)) {
      return editor.showError(`${barrelName} already exists at this location.`);
    }

    return this.getArtifacts(srcPath, barrelType)
      .then(artifacts => this.createBody(artifacts))
      .then(body => io.writeFile(barrelPath, body))
      .then(() => editor.showAndOpen(barrelPath))
      .catch(err => editor.showError(err));
  }


  readSettings(): BarrelSettings {
    return defaultSettings;
  }

  async getArtifacts(srcPath: string, barrelType: BarrelType): Promise<string[]> {
    let artifacts: string[] = [];
    switch (barrelType) {
      case BarrelType.All:
        const files = io.getFiles(srcPath, settings.extensions);
        const directories = io.getDirectories(srcPath);
        artifacts.push(...files, ...directories);
        break;
      case BarrelType.Files:
        artifacts.push(...io.getFiles(srcPath, settings.extensions));
        break;
      case BarrelType.Directories:
        artifacts.push(...io.getDirectories(srcPath));
        break;
    }

    return Promise.resolve(artifacts);
  }

  createItem(barrelTemplate, asset) {
    const itemTemplate = template.hydrate(barrelTemplate, asset)
    return itemTemplate;
  }

  createBody(artifacts: string[]) {

    const rendered = artifacts
      .map(art => this.createItem(settings.itemTemplate, art));

    let body = [
      BARREL_TEMPLATE.header,
      settings.headerTemplate,
      ...rendered,
      settings.footerTemplate,
      BARREL_TEMPLATE.footer,
      EOL
    ];

    return body.join(EOL);
  }

}
