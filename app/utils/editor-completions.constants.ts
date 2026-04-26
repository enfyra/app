export const ENFYRA_COMPLETIONS = [
  { label: '@BODY', type: 'variable', detail: 'Request body ($ctx.$body)' },
  { label: '@QUERY', type: 'variable', detail: 'Query params ($ctx.$query)' },
  { label: '@PARAMS', type: 'variable', detail: 'Route params ($ctx.$params)' },
  { label: '@USER', type: 'variable', detail: 'Current user ($ctx.$user)' },
  { label: '@HELPERS', type: 'variable', detail: 'Helpers: $jwt, $bcrypt, autoSlug' },
  { label: '@SOCKET', type: 'variable', detail: 'WebSocket helper ($ctx.$socket)' },
  { label: '@FETCH', type: 'function', detail: 'Safe fetch helper ($ctx.$helpers.$fetch)' },
  { label: '@DATA', type: 'variable', detail: 'Response data (post-hooks)' },
  { label: '@STATUS', type: 'variable', detail: 'Status code (post-hooks)' },
  { label: '@FLOW_PAYLOAD', type: 'variable', detail: 'Flow input payload' },
  { label: '@FLOW_LAST', type: 'variable', detail: 'Last step result' },
  { label: '@FLOW', type: 'variable', detail: 'Flow data chain' },
  { label: '@FLOW_META', type: 'variable', detail: 'Flow metadata (flowId, flowName)' },
  { label: '@DISPATCH', type: 'variable', detail: 'Flow trigger service' },
  { label: '@DISPATCH.trigger', type: 'function', detail: 'Trigger another flow' },
  { label: '@REPOS', type: 'variable', detail: 'All repositories' },
  { label: '@THROW400', type: 'function', detail: 'Throw Bad Request' },
  { label: '@THROW401', type: 'function', detail: 'Throw Unauthorized' },
  { label: '@THROW403', type: 'function', detail: 'Throw Forbidden' },
  { label: '@THROW404', type: 'function', detail: 'Throw Not Found' },
  { label: '@THROW500', type: 'function', detail: 'Throw Internal Error' },
];

export const ENFYRA_METHOD_COMPLETIONS = [
  { label: '.find', type: 'method', detail: '({ filter, fields, limit, sort })' },
  { label: '.findOne', type: 'method', detail: '({ filter, fields })' },
  { label: '.create', type: 'method', detail: '({ data })' },
  { label: '.update', type: 'method', detail: '({ id, data })' },
  { label: '.delete', type: 'method', detail: '({ id })' },
  { label: '.count', type: 'method', detail: '({ filter })' },
  { label: '.aggregate', type: 'method', detail: '({ aggregate })' },
];

export const VUE_COMPLETIONS = [
  {
    label: 'sfc-ts',
    type: 'snippet',
    detail: 'Vue SFC with <script setup lang="ts">',
    apply: `<template>
  <div class="space-y-4">

  </div>
</template>

<script setup lang="ts">

</script>`,
    boost: 99,
  },
  {
    label: 'script-setup-ts',
    type: 'snippet',
    detail: '<script setup lang="ts">',
    apply: `<script setup lang="ts">

</script>`,
    boost: 98,
  },
  {
    label: 'template',
    type: 'snippet',
    detail: '<template> block',
    apply: `<template>
  <div>

  </div>
</template>`,
    boost: 97,
  },
  { label: 'ref', type: 'function', detail: 'Reactive reference' },
  { label: 'reactive', type: 'function', detail: 'Reactive object' },
  { label: 'computed', type: 'function', detail: 'Computed property' },
  { label: 'readonly', type: 'function', detail: 'Readonly proxy' },
  { label: 'shallowRef', type: 'function', detail: 'Shallow reactive ref' },
  { label: 'shallowReactive', type: 'function', detail: 'Shallow reactive object' },
  { label: 'watch', type: 'function', detail: 'Watch reactive source' },
  { label: 'watchEffect', type: 'function', detail: 'Auto-tracking effect' },
  { label: 'onMounted', type: 'function', detail: 'Lifecycle: mounted' },
  { label: 'onUnmounted', type: 'function', detail: 'Lifecycle: unmounted' },
  { label: 'onBeforeMount', type: 'function', detail: 'Lifecycle: before mount' },
  { label: 'onBeforeUnmount', type: 'function', detail: 'Lifecycle: before unmount' },
  { label: 'onUpdated', type: 'function', detail: 'Lifecycle: updated' },
  { label: 'nextTick', type: 'function', detail: 'Next DOM update' },
  { label: 'defineProps', type: 'function', detail: 'Declare props' },
  { label: 'defineEmits', type: 'function', detail: 'Declare emits' },
  { label: 'defineExpose', type: 'function', detail: 'Expose to parent' },
  { label: 'resolveComponent', type: 'function', detail: 'Resolve dynamic component' },
  { label: 'h', type: 'function', detail: 'Create VNode' },
  { label: 'toRef', type: 'function', detail: 'Property to ref' },
  { label: 'toRefs', type: 'function', detail: 'Object to refs' },
  { label: 'unref', type: 'function', detail: 'Unwrap ref value' },
  { label: 'isRef', type: 'function', detail: 'Check if ref' },
  { label: 'toRaw', type: 'function', detail: 'Get raw object' },
  { label: 'markRaw', type: 'function', detail: 'Mark non-reactive' },
  { label: 'useRoute', type: 'function', detail: 'Nuxt: current route' },
  { label: 'useRouter', type: 'function', detail: 'Nuxt: router instance' },
  { label: 'navigateTo', type: 'function', detail: 'Nuxt: navigate' },
  { label: 'useState', type: 'function', detail: 'Nuxt: shared state' },
  { label: 'useCookie', type: 'function', detail: 'Nuxt: cookie ref' },
  { label: 'useNuxtApp', type: 'function', detail: 'Nuxt: app instance' },
  { label: 'useRuntimeConfig', type: 'function', detail: 'Nuxt: runtime config' },
  { label: 'useFetch', type: 'function', detail: 'Nuxt: fetch data' },
  { label: 'useAsyncData', type: 'function', detail: 'Nuxt: async data' },
  { label: 'useLazyFetch', type: 'function', detail: 'Nuxt: lazy fetch' },
  { label: 'useHead', type: 'function', detail: 'Nuxt: head meta' },
  { label: 'useToast', type: 'function', detail: 'Nuxt UI: toast notifications' },
  { label: 'useApi', type: 'function', detail: 'Enfyra: API client { data, execute, error, pending }' },
  {
    label: 'useApi-get',
    type: 'snippet',
    detail: 'Fetch records from an Enfyra API route',
    apply: `const { data, pending, error, execute } = useApi(() => "/table_name", {
  query: computed(() => ({
    fields: "*",
    limit: 20,
  })),
  immediate: true,
})`,
    boost: 90,
  },
  {
    label: 'useApi-post',
    type: 'snippet',
    detail: 'Create a record through an Enfyra API route',
    apply: `const { execute, pending, error } = useApi(() => "/table_name", {
  method: "post",
  errorContext: "Create Record",
})

async function save() {
  await execute({ body: form.value })
}`,
    boost: 89,
  },
  { label: 'useAuth', type: 'function', detail: 'Enfyra: { me, login, logout, isLoggedIn }' },
  { label: 'usePermissions', type: 'function', detail: 'Enfyra: { hasPermission, checkPermissionCondition }' },
  { label: 'useSchema', type: 'function', detail: 'Enfyra: { schemas, fetchSchema, definition, editableFields, generateEmptyForm }' },
  { label: 'useGlobalState', type: 'function', detail: 'Enfyra: { settings, storageConfigs, sidebarVisible }' },
  { label: 'useScreen', type: 'function', detail: 'Enfyra: { isMobile, isTablet, isDesktop, width, height }' },
  { label: 'useConfirm', type: 'function', detail: 'Enfyra: { confirm({ title, content }) }' },
  { label: 'useHeaderActionRegistry', type: 'function', detail: 'Enfyra: register header actions' },
  { label: 'useSubHeaderActionRegistry', type: 'function', detail: 'Enfyra: register sub-header actions' },
  { label: 'usePageHeaderRegistry', type: 'function', detail: 'Enfyra: register extension page header' },
  {
    label: 'page-header',
    type: 'snippet',
    detail: 'Register extension page header',
    apply: `const pageHeader = usePageHeaderRegistry()

onMounted(() => {
  pageHeader.setPageHeader({
    title: "Page Title",
    description: "Page description",
  })
})`,
    boost: 88,
  },
  {
    label: 'header-action',
    type: 'snippet',
    detail: 'Register page header action',
    apply: `const headerActions = useHeaderActionRegistry()

onMounted(() => {
  headerActions.registerAction({
    id: "primary-action",
    label: "Action",
    icon: "lucide:plus",
    color: "primary",
    onClick: () => {},
  })
})`,
    boost: 87,
  },
  { label: 'useMenuRegistry', type: 'function', detail: 'Enfyra: { menuItems, registerMenuItem }' },
  { label: 'useFilterQuery', type: 'function', detail: 'Enfyra: { buildQuery, createEmptyFilter }' },
  { label: 'useDatabase', type: 'function', detail: 'Enfyra: { getId, getIdFieldName }' },
  { label: 'useRoutes', type: 'function', detail: 'Enfyra: route management' },
  { label: 'useHighlight', type: 'function', detail: 'Enfyra: code highlighting' },
  { label: 'useMounted', type: 'function', detail: 'Enfyra: { isMounted }' },
  {
    label: 'packages',
    type: 'snippet',
    detail: 'Use packages loaded by extension runtime',
    apply: `const packageName = computed(() => packages["package-name"])`,
    boost: 80,
  },
];

export const VUE_SFC_TAG_COMPLETIONS = [
  {
    label: 'template',
    type: 'snippet',
    detail: '<template> block',
    apply: `template>
  <div class="space-y-4">

  </div>
</template>`,
    boost: 100,
  },
  {
    label: 'script setup lang="ts"',
    type: 'snippet',
    detail: '<script setup lang="ts"> block',
    apply: `script setup lang="ts">

</script>`,
    boost: 99,
  },
  {
    label: 'script setup',
    type: 'snippet',
    detail: '<script setup> block',
    apply: `script setup>

</script>`,
    boost: 98,
  },
  {
    label: 'style scoped',
    type: 'snippet',
    detail: '<style scoped> block',
    apply: `style scoped>

</style>`,
    boost: 80,
  },
];

export const VUE_TEMPLATE_COMPLETIONS = [
  { label: 'v-if', type: 'keyword', detail: 'Conditional render', apply: 'v-if=""' },
  { label: 'v-else-if', type: 'keyword', detail: 'Else-if conditional render', apply: 'v-else-if=""' },
  { label: 'v-else', type: 'keyword', detail: 'Else conditional render' },
  { label: 'v-for', type: 'keyword', detail: 'List render', apply: 'v-for="item in items" :key="item.id"' },
  { label: 'v-model', type: 'keyword', detail: 'Two-way binding', apply: 'v-model=""' },
  { label: 'v-show', type: 'keyword', detail: 'Display toggle', apply: 'v-show=""' },
  { label: 'v-slot', type: 'keyword', detail: 'Slot binding', apply: 'v-slot=""' },
  { label: ':class', type: 'property', detail: 'Class binding', apply: ':class=""' },
  { label: ':style', type: 'property', detail: 'Style binding', apply: ':style=""' },
  { label: ':disabled', type: 'property', detail: 'Disabled binding', apply: ':disabled=""' },
  { label: ':loading', type: 'property', detail: 'Loading binding', apply: ':loading=""' },
  { label: '@click', type: 'event', detail: 'Click handler', apply: '@click=""' },
  { label: '@submit', type: 'event', detail: 'Submit handler', apply: '@submit=""' },
  { label: '@update:model-value', type: 'event', detail: 'Nuxt UI model update', apply: '@update:model-value=""' },
  { label: 'template-slot', type: 'snippet', detail: 'Named slot template', apply: 'template #default>\n  \n</template>' },
  { label: 'UButton-primary', type: 'snippet', detail: 'Primary button', apply: 'UButton label="Save" color="primary" @click="" />' },
  { label: 'UFormField-input', type: 'snippet', detail: 'Form field with input', apply: 'UFormField label="Name">\n  <UInput v-model="" />\n</UFormField>' },
  { label: 'CommonEmptyState-basic', type: 'snippet', detail: 'Empty state', apply: 'CommonEmptyState title="No data" description="Nothing to show yet." icon="lucide:inbox" />' },
];

export const VUE_COMPONENT_COMPLETIONS = [
  { label: 'CommonEmptyState', type: 'class', detail: 'Common: empty state display' },
  { label: 'CommonLoadingState', type: 'class', detail: 'Common: loading indicator' },
  { label: 'CommonSettingsCard', type: 'class', detail: 'Common: settings card' },
  { label: 'CommonLazyImage', type: 'class', detail: 'Common: lazy image' },
  { label: 'CommonUploadModal', type: 'class', detail: 'Common: upload modal' },
  { label: 'DataTable', type: 'class', detail: 'Data: sortable table' },
  { label: 'DataTableLazy', type: 'class', detail: 'Data: lazy-loaded table' },
  { label: 'FormEditor', type: 'class', detail: 'Form: metadata-driven editor' },
  { label: 'FilterDrawer', type: 'class', detail: 'Filter builder drawer' },
  { label: 'PermissionGate', type: 'class', detail: 'Permission: conditional render' },
  { label: 'DynamicWidgetComponent', type: 'class', detail: 'Extension: embed widget by ID' },
  { label: 'UButton', type: 'class', detail: 'Nuxt UI: button' },
  { label: 'UCard', type: 'class', detail: 'Nuxt UI: card' },
  { label: 'UInput', type: 'class', detail: 'Nuxt UI: input' },
  { label: 'UTable', type: 'class', detail: 'Nuxt UI: table' },
  { label: 'UBadge', type: 'class', detail: 'Nuxt UI: badge' },
  { label: 'USelect', type: 'class', detail: 'Nuxt UI: select' },
  { label: 'UTextarea', type: 'class', detail: 'Nuxt UI: textarea' },
  { label: 'USwitch', type: 'class', detail: 'Nuxt UI: switch toggle' },
  { label: 'UForm', type: 'class', detail: 'Nuxt UI: form wrapper' },
  { label: 'UFormField', type: 'class', detail: 'Nuxt UI: form field' },
  { label: 'UCheckbox', type: 'class', detail: 'Nuxt UI: checkbox' },
  { label: 'UCheckboxGroup', type: 'class', detail: 'Nuxt UI: checkbox group' },
  { label: 'URadioGroup', type: 'class', detail: 'Nuxt UI: radio group' },
  { label: 'UModal', type: 'class', detail: 'Nuxt UI: modal' },
  { label: 'UDrawer', type: 'class', detail: 'Nuxt UI: drawer' },
  { label: 'UDropdownMenu', type: 'class', detail: 'Nuxt UI: dropdown menu' },
  { label: 'UTooltip', type: 'class', detail: 'Nuxt UI: tooltip' },
  { label: 'UAlert', type: 'class', detail: 'Nuxt UI: alert' },
  { label: 'UAvatar', type: 'class', detail: 'Nuxt UI: avatar' },
  { label: 'UPagination', type: 'class', detail: 'Nuxt UI: pagination' },
  { label: 'UTabs', type: 'class', detail: 'Nuxt UI: tabs' },
  { label: 'UIcon', type: 'class', detail: 'Nuxt UI: icon' },
  {
    label: 'DataTable-example',
    type: 'snippet',
    detail: 'DataTable template example',
    apply: `<DataTable
  :data="data?.data || []"
  :loading="pending"
  :columns="columns"
/>`,
    boost: 86,
  },
];
