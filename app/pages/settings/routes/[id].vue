<template>
  <div class="space-y-6">
    <div class="eapp-page-constrained space-y-6">
      <RouteEditorPanel
        :route-id="routeId"
        :external-api-test="showApiTestModal"
        :show-main-table-card="true"
        :show-empty-state="false"
        :can-update-route="canUpdateRoute"
        :sync-query="true"
        @close-api-test="showApiTestModal = false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const { register: registerSubHeaderActions } = useSubHeaderActionRegistry();
const { register: registerHeaderActions } = useHeaderActionRegistry();
const route = useRoute()
const notify = useNotify()
const { confirm } = useConfirm()
const { routes, loadRoutes } = useRoutes()
const { retryUntilFresh } = useServerSync()
const { getId, getIdFieldName } = useDatabase()
const { getIncludeFields, schemas } = useSchema('enfyra_route')
const { registerPageHeader } = usePageHeaderRegistry()

const routeId = computed(() => String(route.params.id))
const showApiTestModal = ref(false)

registerPageHeader({
  title: 'Route Details',
  gradient: 'purple',
})

const {
  data: routeData,
  pending: loading,
  execute: fetchRoute,
} = useApi('/enfyra_route', {
  query: computed(() => ({
    fields: getIncludeFields(),
    filter: { [getIdFieldName()]: { _eq: routeId.value } },
  })),
  errorContext: 'Fetch Route',
})

useNotFoundGuard(loading, () => !!routeData.value?.data?.[0], 'Route not found')

watch(() => routeData.value?.data?.[0]?.path, (path) => {
  if (path) {
    registerPageHeader({
      title: `Route: ${path}`,
      gradient: 'purple',
    })
  }
}, { immediate: true })

const { checkPermissionCondition } = usePermissions()
const canUpdateRoute = computed(() =>
  checkPermissionCondition({
    and: [{ route: '/enfyra_route', methods: ['PATCH'] }],
  })
)

const {
  error: deleteError,
  execute: executeDeleteRoute,
  pending: deleteLoading,
} = useApi('/enfyra_route', {
  method: 'delete',
  errorContext: 'Delete Route',
})

async function deleteRoute() {
  const ok = await confirm({
    title: 'Are you sure?',
    content: 'This action cannot be undone.',
  })
  if (!ok) return

  await executeDeleteRoute({ id: routeId.value })
  if (deleteError.value) return

  notify.success('Success', 'Route deleted successfully')

  await retryUntilFresh(
    () => loadRoutes(),
    () => routes.value.some((r: any) => String(getId(r)) === routeId.value),
  )

  const { registerDataMenuItems } = useMenuRegistry()
  await registerDataMenuItems(Object.values(schemas.value))
  await navigateTo('/settings/routes')
}

registerHeaderActions([
  {
    id: 'delete-route',
    label: 'Delete',
    icon: 'lucide:trash',
    variant: 'solid',
    color: 'error',
    size: 'md',
    order: 2,
    onClick: deleteRoute,
    loading: computed(() => deleteLoading.value),
    disabled: computed(() => routeData.value?.data?.[0]?.isSystem ?? false),
    permission: {
      and: [{ route: '/enfyra_route', methods: ['DELETE'] }],
    },
  },
])

registerSubHeaderActions([
  {
    id: 'test-api',
    label: 'Test API',
    icon: 'lucide:play',
    variant: 'soft',
    color: 'warning',
    size: 'md',
    onClick: () => { showApiTestModal.value = true },
  },
])

onMounted(fetchRoute)
</script>
