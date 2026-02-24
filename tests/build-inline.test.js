import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inlineTemplate } from '../scripts/build-inline.js';

test('inlineTemplate injects JS into template', () => {
  const html = '<html><body><!-- INLINE_SCRIPT --></body></html>';
  const result = inlineTemplate(html, 'console.log(1);');
  assert.ok(result.includes('<script>'));
  assert.ok(result.includes('console.log(1);'));
  assert.ok(!result.includes('INLINE_SCRIPT'));
});
