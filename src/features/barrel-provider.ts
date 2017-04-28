'use strict';

import * as vscode from 'vscode';
import * as io from '../lib/io';
import * as editor from '../lib/editor';
import * as template from '../lib/template';
import { EOL } from 'os';

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

export default class BarrelProvider {
  private static barrelAllCmdId: string = 'ng42.BarrelProvider.barrelAll';
  private static barrelFilesCmdId: string = 'ng42.BarrelProvider.barrelFiles';
  private static barrelDirectoryCmdId: string = 'ng42.BarrelProvider.barrelDirectory';

  private barrelAllCmd: vscode.Disposable;
  private barrelFilesCmd: vscode.Disposable;
  private barrelDirectoryCmd: vscode.Disposable;

  activate(context: vscode.ExtensionContext) {
    if (DEBUG) console.log("Barreler active...");
    let subscriptions: vscode.Disposable[] = context.subscriptions;

    settings = this.readSettings();

    this.barrelAllCmd = vscode.commands.registerCommand(BarrelProvider.barrelAllCmdId, this.barrelAll.bind(this));
    this.barrelFilesCmd = vscode.commands.registerCommand(BarrelProvider.barrelFilesCmdId, this.barrelFiles.bind(this));
    this.barrelDirectoryCmd = vscode.commands.registerCommand(BarrelProvider.barrelDirectoryCmdId, this.barrelDirectories.bind(this));

    subscriptions.push(this);
  }

  dispose(): void {
    this.barrelAllCmd.dispose();
    this.barrelFilesCmd.dispose();
    this.barrelDirectoryCmd.dispose();
  }

  barrelAll(uri?: vscode.Uri) {
    return this.createBarrel(uri, BarrelType.All);
  }

  barrelFiles(uri?: vscode.Uri) {
    return this.createBarrel(uri, BarrelType.Files);
  }

  barrelDirectories(uri?: vscode.Uri) {
    return this.createBarrel(uri, BarrelType.Directories);
  }

  createBarrel(uri: vscode.Uri, barrelType: BarrelType) {
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

  getArtifacts(srcPath: string, barrelType: BarrelType): Promise<string[]> {
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
