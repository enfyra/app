# Enfyra App v2.2.11

## Features

- Added `CommonResourceListFrame` and `CommonResourceListItem` to dynamic extension runtime globals so extensions can reuse the standard resource-list layout.
- Added route-backed `CommonResourceListItem` navigation with accessible focus handling and size-aware loading placeholders.
- Added `useTableCatalog` to share table-catalog loading across collection, data, and configuration pages.
- Added focused schema index-conflict notifications that identify the overlapping unique constraints.

## Operational Flow

- Before: Resource-list pages used separate skeleton-row templates and many navigation items relied on click handlers.
- After: `CommonResourceListItem` supplies the loading state and can render a `NuxtLink`, giving list pages a consistent loading and navigation experience.

- Before: The Redis runtime view kept redundant overview data while key-load state was less explicit.
- After: `RuntimeRedisTab` uses the streamlined runtime metrics contract and exposes key loading state directly.

## Bug Fixes

- Fixed `CommonDrawer` consumers so drawers use the required handle-only interaction mode consistently.
- Fixed schema editors to load metadata before generating create and index forms.
- Fixed schema constraint guidance so an index covered by the leading fields of a unique constraint explains the exact coverage.
- Improved dark-theme contrast, card and tab chrome, and navigation links across the admin UI.
- Updated `package.json` version to `2.2.11`.
