import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

import { SimpleIOResult } from '../models';
import { workspace } from 'vscode';



export function getFullPath(srcPath: string, filename: string) {
  return path.join(srcPath, filename);
}

export function getDirectories(srcPath: string, excludes: string | string[]): SimpleIOResult[] {
  const results = glob.sync('**/', {
    cwd: srcPath,
    ignore: excludes,
    nodir: false
  }).map(path => ({
    path,
    isDirectory: true
  }));

  return results;
}

export function getFiles(srcPath: string, includes: string, excludes: string | string[]): SimpleIOResult[] {
  const results = glob.sync(includes, {
    cwd: srcPath,
    ignore: excludes,
    nodir: true
  }).map(result => ({
    path: path.parse(result).name,
    isDirectory: false
  }));

  return results;
}

export function exists(filePath: string) {
  return fs.existsSync(filePath);
}

export function writeFile(outPath: string, output: string) {
  return fs.writeFileSync(outPath, output);
}

