export function hydrate(template: string, source: string) {
  return template.replace(/\$asset_name/, source);
}
