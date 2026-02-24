import fs from 'node:fs';
import path from 'node:path';

export function inlineTemplate(templateHtml, jsCode) {
  return templateHtml.replace('<!-- INLINE_SCRIPT -->', `<script>\n${jsCode}\n</script>`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.cwd();
  const templatePath = path.join(root, 'index.template.html');
  const bundlePath = path.join(root, 'dist', 'bundle.js');
  const outPath = path.join(root, 'index.html');
  const template = fs.readFileSync(templatePath, 'utf8');
  const bundle = fs.readFileSync(bundlePath, 'utf8');
  const result = inlineTemplate(template, bundle);
  fs.writeFileSync(outPath, result);
}
