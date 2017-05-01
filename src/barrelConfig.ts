import { workspace, WorkspaceConfiguration } from 'vscode';
import { ActivtableBlog, EnableBarrelTemplates, EnableBarrelMenus } from './models';
import { EOL } from 'os';

export class BarrelConfig {
  barrelName: string;
  include: ActivtableBlog;
  exclude: ActivtableBlog;
  fileTemplate: string;
  directoryTemplate: string;
  headerTemplate: string;
  footerTemplate: string;
  useTemplates: EnableBarrelTemplates;
  eol: string;
  menus; EnableBarrelMenus;

  constructor(config: WorkspaceConfiguration) {
    this.barrelName = config.get<string>('barrelName');
    this.eol = this.getEndOfLine(config.get<string>('eol'));
    this.include = config.get<ActivtableBlog>('include');
    this.exclude = config.get<ActivtableBlog>('exclude');
    this.fileTemplate = this.getString(config.get<any>('fileTemplate'));
    this.directoryTemplate = this.getString(config.get<any>('directoryTemplate'));
    this.headerTemplate = this.getString(config.get<any>('headerTemplate'));
    this.footerTemplate = this.getString(config.get<any>('footerTemplate'));

    this.useTemplates = config.get<EnableBarrelTemplates>('useTemplates');
    this.menus = config.get<EnableBarrelMenus>('menus');
  }

  private getEndOfLine(value: string) {
    if (value === 'os') { return EOL }
    return value;
  }

  private getString(value: string | string[]) {
    if (typeof value === 'string') { return EOL; }
    else {
      return value.join(this.eol);
    }
  }
}
