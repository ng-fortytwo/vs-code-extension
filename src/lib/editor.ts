import * as vscode from 'vscode';

export function showAndOpen(srcPath: string) {
  return vscode.workspace.openTextDocument(srcPath)
    .then((textDocument) => vscode.window.showTextDocument(textDocument));
}

export function showError(err: string) {
  return vscode.window.showErrorMessage(err);
}
