# Enfyra App v2.2.8-patch-3

## Features
- Added `CommonResourceListFrame`, `CommonResourceListItem`, `CommonResourceListSkeletonRow`, and `app/types/resource-list.ts` for consistent resource-list screens with shared loading, empty, pagination, action, badge, and metadata patterns.
- Added `DetailFormSkeleton` for richer detail/edit loading states.
- Added `/settings/resource-list-demo` to exercise the shared resource-list components during UI development.

## Operational Flow
- Before: Collections, package pages, storage configuration, and many settings pages used separate card/list patterns with inconsistent loading and refresh states.
- After: These screens use the shared resource-list layout, giving operators consistent rows, metadata badges, action placement, pagination, empty states, and skeleton refresh behavior.
- Before: API Tester mixed custom and system routes in expandable card groups.
- After: API Tester separates custom and system routes with tab navigation and resource-list rows, making route selection and loading states easier to scan.

## Bug Fixes
- Improved loading skeletons across collection, package, settings, storage, websocket, menu, method, and flow editor surfaces so refreshes preserve layout shape more consistently.
- Updated `ThemeAccountPanelItem`, `ColorPairPicker`, `MenuVisualEditor`, and related theme/list styling to better match the shared app chrome.
- Reduced the dark shell content tint in `app/assets/css/theme.css` so dark mode surfaces stay quieter while retaining the active accent.
- Updated `package.json` version to `2.2.8-patch-3`.
