import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(file: string) {
  return readFileSync(new URL(`../../app/composables/shared/${file}`, import.meta.url), 'utf8');
}

describe('boot query metadata fields', () => {
  it('does not request a methods relation from settings', () => {
    expect(source('useGlobalState.ts')).not.toContain('"methods.*"');
  });

  it('does not request an icon column from route mainTable metadata', () => {
    expect(source('useRoutes.ts')).not.toContain("'mainTable.icon'");
  });
});
