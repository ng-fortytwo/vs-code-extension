'use strict';

import { workspace, Disposable, ExtensionContext, window } from 'vscode';
import * as nls from 'vscode-nls';

import { BarrelProvider } from './providers/barrelProvider';
import { BarrelConfig } from './barrelConfig'


const localize = nls.config()();

async function init(disposables: Disposable[]): Promise<void> {
  const rootPath = workspace.rootPath;
  const barrlConfig = new BarrelConfig(workspace.getConfiguration('ng42.barrels'));

  if (!rootPath || !barrlConfig) {
    return;
  }

  const outputChannel = window.createOutputChannel('NG.42');
  outputChannel.appendLine(localize('NG.42 initialized', "NG.42 initialized"));

  const barreler = new BarrelProvider(barrlConfig, outputChannel);

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
