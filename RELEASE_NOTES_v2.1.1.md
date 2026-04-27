# Enfyra App v2.1.1

## Features
- Added OAuth user provisioning script controls to `/settings/oauth/config/create` and `/settings/oauth/config/[id]`, allowing admins to define a TypeScript-first `sourceCode` script that returns default user fields for newly created OAuth users.
- Added automatic `redirectUri` generation in OAuth config forms using the current Nuxt app origin and disabled the field so admins can copy the provider callback URL without manually editing it.
- Added script return validation for `/settings/routes` and route flow editors so route handlers must return a value, pre-hooks may return a value, and post-hooks reject returned values.
- Added a permission-aware test/run button to JavaScript and TypeScript `FormCodeEditor` fields, with per-field `fieldMap` controls to hide it where a dedicated test UI already exists.
- Added OAuth callback error display on `/login` so failed OAuth redirects can show a clear error message after returning to the Nuxt app.

## Bug Fixes
- Fixed `FormCodeEditor` TypeScript diagnostics for Enfyra macros so `@REPOS` and `#table` repository calls match the server runtime contract: `find`, `create`, and `update` return result envelopes with `data`, while `delete` returns `{ message, statusCode }`.
- Fixed Vue script diagnostics in `app/utils/editor/enfyraTypeScriptLinter.ts` so Vue SFC script blocks can be linted without unsafe attribute indexing.
- Fixed typecheck coverage for `tests/nuxt/common-modal-drawer.nuxt.test.ts` by importing Vitest test helpers explicitly.
- Updated `nuxt.config.ts` Vite dependency optimization so CodeMirror, Vue DevTools, Socket.IO, TypeScript, and table dependencies are pre-bundled during dev and do not trigger late dependency discovery reloads.
- Added local `vue-tsc` and `@vue/language-core` dev dependencies so `yarn nuxi typecheck` runs from project dependencies without npm fallback warnings.
