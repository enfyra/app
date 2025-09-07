# Enfyra App - Project Structure Documentation

## Overview
Enfyra App is a content management system built on Nuxt 3 with Vue 3 Composition API and TypeScript. The project uses Nuxt UI and Tailwind CSS for the user interface.

## Root Level Files
- `nuxt.config.ts` - Nuxt 3 configuration
- `app.vue` - Root application component
- `app.config.ts` - Application configuration
- `package.json` - Dependencies and scripts
- `tailwind.config.js` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration

## Directory Structure

### `/assets/` - Static Assets
```
assets/
├── css/
│   ├── main.css          # Global CSS styles
│   └── transitions.css   # CSS transitions cho animations
```

### `/components/` - Vue Components
Tổ chức theo chức năng và tầng (layers):

```
components/
├── common/                    # Shared components
│   ├── BreadCrumbs.vue       # Breadcrumb navigation
│   ├── SettingsCard.vue      # Card component for settings pages
│   ├── EmptyState.vue        # Empty state display
│   ├── LoadingState.vue      # Loading states
│   ├── MobileWarning.vue     # Mobile device warning
│   ├── GlobalConfirm.vue     # Global confirmation dialog
│   ├── GlobalLoading.vue     # Global loading indicator
│   ├── LoadingWireframe.vue  # Wireframe loading state
│   ├── UploadModal.vue       # File upload modal
│   ├── Full.vue              # Full layout component
│   ├── Mini.vue              # Mini layout component
│   └── loading/              # Loading animations
│       ├── Bars.vue          # Bar loading animation
│       ├── Dots.vue          # Dots loading animation
│       ├── Progress.vue      # Progress bar
│       ├── Pulse.vue         # Pulse loading animation
│       ├── Skeleton.vue      # Skeleton loading
│       └── Spinner.vue       # Spinner loading
│
├── dynamic/                  # Dynamic components
│   ├── PageComponent.vue     # Dynamic page extension loading
│   └── WidgetComponent.vue   # Dynamic widget extension loading
│
├── data-table/               # Table components
│   ├── DataTable.vue         # Main data table
│   ├── TabletCard.vue        # Tablet view cards
│   ├── BulkActions.vue       # Bulk operations
│   └── ColumnSelector.vue    # Column visibility controls
│
├── filter/                   # Filter system
│   ├── Builder.vue           # Filter query builder
│   ├── Drawer.vue           # Filter sidebar drawer
│   ├── Condition.vue        # Individual filter conditions
│   └── Group.vue            # Filter groups
│
├── form/                     # Form components
│   ├── Field.vue            # Base form field
│   ├── FieldRenderer.vue     # Dynamic field rendering
│   ├── Editor.vue           # Rich text editor wrapper
│   ├── CodeEditor.vue       # Code editor component
│   ├── CodeEditorLazy.vue   # Lazy-loaded code editor
│   ├── RichTextEditor.vue   # Rich text editor
│   ├── RichTextEditorLazy.vue # Lazy-loaded rich text editor
│   ├── UuidField.vue        # UUID field component
│   ├── permission/          # Permission-specific forms
│   │   ├── Editor.vue       # Permission editor
│   │   ├── Field.vue        # Permission field
│   │   ├── Group.vue        # Permission group
│   │   ├── InlineEditor.vue # Inline permission editor
│   │   ├── RoutePicker.vue  # Route picker
│   │   └── Selector.vue     # Permission selector
│   └── relation/            # Relational field components
│       ├── Actions.vue      # Relation actions
│       ├── CreateDrawer.vue # Create relation drawer
│       ├── DetailDrawer.vue # Detail drawer
│       ├── InlineEditor.vue # Inline relation editor
│       ├── List.vue         # Relation list
│       ├── Pagination.vue   # Relation pagination
│       └── Selector.vue     # Relation selector
│
├── layout/                   # Layout components
│   ├── Header.vue           # Main header
│   └── HeaderActions.vue    # Header action buttons
│
├── sidebar/                  # Sidebar navigation
│   ├── Menu.vue             # Full sidebar menu
│   └── MiniSidebar.vue      # Collapsed sidebar
│
├── table/                    # Table management components
│   ├── Columns.vue          # Column management
│   ├── Constraints.vue      # Table constraints
│   ├── Form.vue            # Table form
│   └── Relations.vue        # Table relations
│
├── ArraySelectEditor.vue     # Array select editor
├── PermissionGate.vue       # Permission gate component
├── RouteLoading.vue         # Route loading indicator
└── SimpleArrayEditor.vue    # Simple array editor
```

### `/composables/` - Vue Composables
Business logic and state management:

```
composables/
├── useApi.ts                    # API calls and error handling
├── useApiLazy.ts                # Lazy API calls
├── useDynamicComponent.ts       # Dynamic component loading
├── useAuth.ts                   # Authentication state
├── useMenuRegistry.ts           # Dynamic menu system
├── useHeaderActionRegistry.ts   # Header actions management
├── usePermissions.ts           # Permission checking
├── useSchema.ts                # Schema operations
├── useFilterQuery.ts           # Filter query building
├── useScreen.ts                # Screen size detection
├── useLoader.ts                # Loading states
├── useConfirm.ts               # Confirmation dialogs
├── useMounted.ts               # Mount state tracking
└── useGlobalState.ts           # Global app state
```

### `/pages/` - Route Pages
File-based routing following Nuxt conventions:

```
pages/
├── index.vue                    # Home/Dashboard redirect
├── login.vue                   # Login page
├── dashboard.vue               # Main dashboard
├── [sidebar].vue               # Dynamic single-param routing
├── [sidebar]/
│   └── [page].vue              # Dynamic two-param routing
│
├── collections/                # Collection management
│   ├── index.vue              # Collections listing
│   ├── create.vue             # Create new collection
│   └── [table].vue            # Individual collection page
│
├── data/                       # Data management
│   ├── index.vue              # Data overview
│   └── [table]/               # Table-specific data
│       ├── index.vue          # Data listing
│       ├── create.vue         # Create new record
│       └── [id].vue           # Edit record
│
└── settings/                   # Settings pages
    ├── index.vue              # Settings overview
    ├── users/                 # User management
    ├── roles/                 # Role management
    ├── menus/                 # Menu management
    ├── extensions/            # Extension management
    ├── handlers/              # Handler management
    ├── hooks/                 # Hook management
    ├── routings/              # Route management
    └── general/               # General settings
```

### `/layouts/` - Layout Templates
```
layouts/
└── default.vue                # Main application layout
```

### `/middleware/` - Route Middleware
```
middleware/
├── auth.global.ts             # Global authentication check
└── dashboard-redirect.global.ts # Dashboard redirect logic
```

### `/plugins/` - Nuxt Plugins
```
plugins/
├── api-refresh.client.ts      # API token refresh
├── loading.client.ts          # Global loading state
├── menu-registry.client.ts    # Menu registry initialization
└── router.client.ts           # Router customizations
```

### `/server/` - Server-side Code
```
server/
├── api/                       # API endpoints
│   ├── [...path].ts          # Catch-all API proxy
│   ├── login.post.ts         # Login endpoint
│   ├── logout.post.ts        # Logout endpoint
│   ├── me.get.ts             # Current user endpoint
│   └── extension_definition/  # Extension API endpoints
│
└── middleware/                # Server middleware
    ├── [...path].ts          # API middleware
    └── server-id.ts          # Server identification
```

### `/utils/` - Utility Functions
```
utils/
├── types/                     # TypeScript type definitions
│   ├── api.ts                # API response types
│   ├── extensions.ts         # Extension types
│   ├── permissions.ts        # Permission types
│   ├── menu.ts               # Menu types
│   └── ui.ts                 # UI component types
│
├── common/                    # Common utilities
│   ├── constants.ts          # App constants
│   ├── filter/               # Filter utilities
│   └── regex.ts              # Regex patterns
│
├── components/                # Component utilities
│   └── form.ts               # Form helpers
│
└── server/                    # Server utilities
    ├── auth/                 # Authentication helpers
    ├── extension.ts          # Extension loading
    └── proxy.ts              # API proxy utilities
```

### `/docs/` - Documentation
```
docs/
├── project-structure.md             # This file
├── permission-system.md             # Permission system guide
├── permission-system-quick-reference.md # Permission quick reference
├── menu-registry-system.md          # Menu system documentation
├── header-action-registry.md        # Header actions guide
├── filter-query.md                  # Filter system guide
├── form-field.md                    # Form field documentation
├── settings-card.md                 # SettingsCard component guide
├── api-composables.md               # API composables guide
└── plugin-development-guide-vi.md   # Plugin development (Vietnamese)
```

## Key Architecture Patterns

### 1. Dynamic Component Loading
- `DynamicComponent.vue` - Loads components based on path
- Extension system cho plugins
- File-based routing với `[sidebar].vue` và `[sidebar]/[page].vue`

### 2. Registry Systems
- **Menu Registry**: Dynamic menu generation từ tables
- **Header Action Registry**: Dynamic header buttons
- **Permission System**: Role-based access control

### 3. Component Patterns
- **SettingsCard**: Standardized card component với props-based actions
- **DataTable**: Responsive table với tablet cards
- **Filter System**: Advanced querying capabilities

### 4. State Management
- Vue 3 Composition API
- Composables cho business logic
- Global state với `useGlobalState`

### 5. Form System
- Dynamic field rendering
- Permission integration
- Relation field support
- Rich text editing

### 6. API Integration
- Proxy-based API calls
- Error handling
- Loading states
- Token refresh

## Development Guidelines

### Component Organization
- `/common/` - Reusable UI components
- `/data-table/` - Table-specific components  
- `/form/` - Form-related components
- `/filter/` - Filter system components

### Composable Patterns
- Prefix với `use`
- Return reactive state và methods
- Handle loading/error states
- Provide TypeScript types

### Page Structure
- Index pages cho listings
- Create pages cho new records
- `[id]` pages cho editing
- Consistent pagination patterns

### Styling Approach
- Tailwind CSS utility-first
- Dark mode support
- Responsive design
- Consistent spacing/colors

## Extension System
Extensions được load dynamic qua:
- `/enfyra-extension/` directory
- Database-driven configuration
- Dynamic component resolution
- Hot-reloadable development

## Mobile Support
- Responsive breakpoints
- Tablet-specific layouts
- Mobile warning component
- Touch-friendly interactions

---
*Last updated: Conversation summary từ 2025-01-13*