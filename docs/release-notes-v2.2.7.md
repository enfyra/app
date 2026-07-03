# Enfyra App v2.2.7

## Bug Fixes

- Removed unused package subpages in `app/pages/packages/app.vue` and `app/pages/packages/backend.vue`, reducing stale navigation surface for package management.
- Removed unused props, imports, handlers, and state from form, table, permission, route, storage, websocket, flow, menu, sidebar, and settings components.
- Improved `app/composables/editor/useCodeMirrorExtensions.ts` and `app/composables/editor/useCodeMirrorTheme.ts` by trimming unused editor setup paths.
- Improved `app/components/form/EnumPicker.vue`, `app/components/table/Columns.vue`, and `app/components/table/Relations.vue` by simplifying unused view state and handlers.
- Improved `app/components/menu/MenuVisualEditor.vue` and `app/components/menu/MenuVisualEditorItem.vue` by removing unused drag/drop state after the menu reorder flow stabilized.
- Improved `app/composables/shared/useNotify.ts` and related app utilities by removing unused notification and state helpers.
- Updated `server/middleware/cors.ts` and `server/utils/cors-origin-proxy.ts` by removing unused server-side CORS helper state.
- Updated `package.json` version to `2.2.7`.
