'use strict';

import { workspace, Disposable, ExtensionContext, window } from 'vscode';
import * as nls from 'vscode-nls';

import BarrelProvider from './providers/barrelProvider';



const localize = nls.config()();

async function init(disposables: Disposable[]): Promise<void> {
  const rootPath = workspace.rootPath;
  if (!rootPath) { return; }

  const outputChannel = window.createOutputChannel('Git');
  outputChannel.appendLine(localize('NG.42 initialized', "NG.42 initialized"));

  const barreler = new BarrelProvider(null, outputChannel);


  disposables.push(barreler);
}

export function activate(context: ExtensionContext): any {
  if (!workspace.rootPath) {
    return;
  }

  const disposables: Disposable[] = [];
  context.subscriptions
    .push(new Disposable(() => Disposable.from(...disposables).dispose()));

  init(disposables)
    .catch(err => console.error(err));
}
