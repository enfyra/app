import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '../../app');
const files = [
  'composables/shared/useGlobalState.ts',
  'pages/settings/guards/[id].vue',
  'pages/settings/websockets/[id].vue',
];

describe('eApp unlimited query contract', () => {
  it.each(files)('%s uses zero, never negative one, for unlimited reads', (file) => {
    expect(readFileSync(join(root, file), 'utf8')).not.toMatch(/\blimit\s*:\s*-1\b/);
  });
});
