import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('shared Input associates labels, validation errors, and helper text with controls', async () => {
  const source = await readFile(new URL('../src/components/ui/Input.jsx', import.meta.url), 'utf8');

  assert.match(source, /React\.useId\(\)/);
  assert.match(source, /<label htmlFor=\{inputId\}/);
  assert.match(source, /id=\{inputId\}/);
  assert.match(source, /aria-invalid=\{Boolean\(error\)\}/);
  assert.match(source, /aria-describedby=\{\(error \|\| helperText\) \? messageId/);
  assert.match(source, /role="alert"/);
});
