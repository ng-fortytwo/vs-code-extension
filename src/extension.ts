'use strict';

import * as vscode from 'vscode';
import BarrelProvider from './features/barrel-provider';


export function activate(context: vscode.ExtensionContext): void {
	let barreler = new BarrelProvider();
	barreler.activate(context);
}
