import { EOL } from 'os';

export function hydrate(template: string, source: any) {
  return template.replace(/\$asset_name/, source);
}
