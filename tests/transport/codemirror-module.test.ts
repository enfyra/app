import { describe, expect, it, vi } from 'vitest';

vi.mock('@nuxt/kit', () => ({ defineNuxtModule: (definition: unknown) => definition }));

import compatibility from '../../modules/normalize-vite-resolve-alias';

function hooks() {
  const registered = new Map<string, (...args: any[]) => void>();
  (compatibility as any).setup({}, { hook: (name: string, callback: (...args: any[]) => void) => registered.set(name, callback) });
  return registered;
}

describe('CodeMirror module compatibility', () => {
  it('repairs the package auto-import to the shipped JavaScript module', () => {
    const imports = [{ name: 'useNuxtCodeMirror', from: '/app/node_modules/nuxt-codemirror/dist/runtime/composables/useNuxtCodeMirror.ts' }];
    const handler = hooks().get('imports:extend');
    expect(handler).toBeDefined();
    handler!(imports);
    expect(imports[0].from).toBe('/app/node_modules/nuxt-codemirror/dist/runtime/composables/useNuxtCodeMirror.js');
  });

  it('normalizes string aliases without losing regex or custom resolver semantics', () => {
    const registered = hooks();
    const normalize = registered.get('vite:extendConfig')!;
    const plain = { resolve: { alias: [{ find: '#app', replacement: '/nuxt/app' }] } };
    normalize(plain);
    expect(plain.resolve.alias).toEqual({ '#app': '/nuxt/app' });
    const regex = /^virtual:/;
    const entries = [{ find: regex, replacement: '/virtual' }];
    const complex = { resolve: { alias: entries } };
    normalize(complex);
    expect(complex.resolve.alias).toBe(entries);
  });
});
