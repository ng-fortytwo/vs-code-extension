export function hydrateTemplate(template: string, source: string) {
  return template.replace(/\$asset_name/g, source);
}
