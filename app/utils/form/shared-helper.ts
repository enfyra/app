import type { SharedHelperForm, SharedHelperRecord } from '~/types/shared-helper';

const reservedNames = new Set(['__proto__', 'prototype', 'constructor', 'run', 'then', 'catch', 'finally']);

export function normalizeSharedHelperForm(record: SharedHelperRecord): SharedHelperForm {
  return {
    name: record.name ?? '',
    description: record.description ?? '',
    isEnabled: record.isEnabled !== false,
    scriptLanguage: record.scriptLanguage === 'javascript' ? 'javascript' : 'typescript',
    sourceCode: record.sourceCode ?? '',
  };
}

export function validateSharedHelperForm(form: SharedHelperForm): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!/^[a-z0-9][a-z0-9_]{0,127}$/.test(form.name) || reservedNames.has(form.name)) {
    errors.name = 'Use a unique lowercase name with 1–128 letters, digits or underscores. Runtime names are reserved.';
  }
  if (form.isEnabled && !form.sourceCode.trim()) errors.sourceCode = 'An enabled helper needs source code.';
  return errors;
}

export function buildHelperInvocation(name: string): string {
  return `const result = await @HELPERS.run('${name}', {\n  query: 'Search terms',\n});`;
}

export function buildHelperTestScript(source: string): string {
  return `return await (async function($ctx) {\n${source}\n})(Object.assign(Object.create(null), { $params: @BODY.params, $body: {}, $query: {}, $share: {}, $user: null, $helpers: @HELPERS, $repos: @REPOS, $transaction: @TRANSACTION, $cache: @CACHE, $storage: @STORAGE, $socket: @SOCKET, $pkgs: @PKGS, $streams: $ctx.$streams, $logs: @LOGS, $throw: $ctx.$throw, $trigger: @TRIGGER, $res: @RES, $env: {} }));`;
}

export function buildSharedHelperFieldMap(disabled = false) {
  return {
    name: { label: 'Name', description: 'Unique lowercase name, at most 128 letters, digits or underscores. Callers use this exact name.', disabled },
    description: { label: 'Description', description: 'Describe the params, result and side effects for other code authors.', disabled },
    isEnabled: { label: 'Enabled', description: 'Disabled helpers cannot be called. Keep unfinished drafts disabled.', disabled },
    scriptLanguage: { label: 'Language', disabled },
    sourceCode: {
      label: 'Source code',
      description: 'Script body. Read @PARAMS and use Enfyra macros such as #table. Return a value or call another helper with await @HELPERS.run(name, params).',
      height: '480px',
      testRun: false,
      disabled,
    },
    compiledCode: { excluded: true },
  };
}
