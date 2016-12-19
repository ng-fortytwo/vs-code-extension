'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { EOL } from 'os';


export function activate(context: vscode.ExtensionContext) {
    const d1 = vscode.commands.registerCommand('ngFortyTwoCode.createBarrelFolders', createBarrelFolders);
    const d2 = vscode.commands.registerCommand('ngFortyTwoCode.createBarrelFiles', createBarrelFiles);
    const d3 = vscode.commands.registerCommand('ngFortyTwoCode.createBarrelAll', createBarrelAll);

    context.subscriptions.push(d1, d2, d3);
}

  function createBarrelFolders(uri: vscode.Uri) {
    const assets = getDirectories(uri.path);

    createBarrel(uri, assets);
  }

  function createBarrelFiles(uri: vscode.Uri) {
    const assets = getFiles(uri.path);

    createBarrel(uri, assets);
  }5

  function createBarrelAll(uri: vscode.Uri) {
    const assets = [
      ...getDirectories(uri.path),
      ...getFiles(uri.path)
    ];

    createBarrel(uri, assets);
  }

  function createBarrel(uri: vscode.Uri, assets) {
    const dirs  = assets;

    if(!hasIndex(uri.path) && dirs.length){

      const outputPath = path.join(uri.path, 'index.ts');
      const output = dirs.reduce((out, assetPath) =>
        out.concat(`export * from './${assetPath}';${EOL}`), ''); // todo: get template from settings.

      fs.writeFile(outputPath, output, (err) => {
        if (err) {
          return vscode.window.showErrorMessage('Unable to create Barrel.');
        }

        vscode.workspace.openTextDocument(outputPath)
          .then((textDocument) => vscode.window.showTextDocument(textDocument));
      });
    }
  }

function getFiles(srcpath) {
  return fs.readdirSync(srcpath)
    .filter((file) => {
      const filePath = path.join(srcpath, file);
      const stat = fs.statSync(filePath)
      return stat.isFile() && path.extname(file) === '.ts';
    })
    .map(file => path.basename(file, '.ts'));
}

function getDirectories(srcpath) {
  return fs.readdirSync(srcpath).filter((file) => {
    const stat = fs.statSync(path.join(srcpath, file))
    return stat.isDirectory();
  });
}

function hasIndex(srcPath) {
  //todo replace with type in options.
  return fs.existsSync(path.join(srcPath, 'index.ts'));
}



export function deactivate() {
}
