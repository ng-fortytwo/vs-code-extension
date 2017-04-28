import * as fs from 'fs';
import * as path from 'path';

export function getFullPath(srcPath: string, filename: string) {
  return path.join(srcPath, filename);
}

export function getDirectories(srcPath: string) {
  return fs.readdirSync(srcPath)
    .filter((file) => {
      const stat = fs.statSync(getFullPath(srcPath, file))
      return stat.isDirectory();
    });
}

export function getFiles(srcPath: string, exts?: string[]) {
  let files = fs.readdirSync(srcPath)
    .filter((file) => {
      const filePath = getFullPath(srcPath, file);
      const stat = fs.statSync(filePath);
      const ext = path.extname(file);
      const isEnabledType = !!exts.find(x => x === ext);

      return stat.isFile() && isEnabledType;
    })
    .map(file => {
      return exts.reduce((filename, ext) => {
        return path.basename(filename, ext);
      }, file)
    });

    return files;
}

export function exists(filePath: string) {
  return fs.existsSync(filePath);
}

export function writeFile(outPath: string, output: string) {
  return fs.writeFileSync(outPath, output);
}

