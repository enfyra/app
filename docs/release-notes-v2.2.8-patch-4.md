# Enfyra App v2.2.8-patch-4

## Operational Flow
- Before: Resource manager rows and workflow views often fetched full records, relation wildcards, or script bodies even when the screen only displayed summary metadata.
- After: Collection, package, storage, route, guard, flow, websocket, user, role, method, OAuth, and bootstrap list surfaces request only display fields, keeping row-list loading lighter while preserving the same user-facing data.
- Before: Flow detail loaded every step script body when opening the canvas, and script tiles could expose code snippets or redundant generic labels.
- After: `/settings/flows/[id]` loads step canvas metadata first and fetches `sourceCode`/`compiledCode` only when a step editor opens, while script and condition tiles no longer show code previews or duplicate type text.
- Before: Row-list manager pages still paginated at nine items, matching the old card-grid layout.
- After: Row-list manager pages paginate at ten items per page for cleaner scanning.

## Bug Fixes
- Improved `RouteEditorPanel`, `useRouteEditorWorkflows`, and `ExecutionFlowVisualization` so route workflow graphs load handler, hook, guard, and route summary metadata without fetching script source for every tile.
- Improved `MethodSelector`, `RoutePicker`, `useGlobalState`, package pages, and settings list pages to avoid unnecessary wildcard field selection.
- Fixed shared action renderers in `SettingsCard`, `PageHeader`, `Header`, `SubHeader`, `EmptyState`, and `ExtensionPreviewModal` so button click handlers are wrapped with void-returning functions and IDE template diagnostics no longer infer invalid return values.
- Updated `package.json` version to `2.2.8-patch-4`.
