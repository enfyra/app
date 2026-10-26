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
import type { FeatureCollection, FeatureRouteHeader } from '~/types/feature-api';
const { register: registerSubHeaderActions } = useSubHeaderActionRegistry();
const { register: registerHeaderActions } = useHeaderActionRegistry();
const route = useRoute()
const notify = useNotify()
const { confirm } = useConfirm()
const { routes, loadRoutes } = useRoutes()
const { retryUntilFresh } = useServerSync()
const { getId, getIdFieldName } = useDatabase()
const ROUTE_DETAIL_HEADER_FIELDS = [
  'id',
  'path',
  'isSystem',
].join(',')

const routeId = computed(() => String(route.params.id))
const showApiTestModal = ref(false)

const {
  data: routeData,
  error: routeError,
  pending: loading,
  execute: fetchRoute,
} = useApi<FeatureCollection<FeatureRouteHeader>>('/enfyra_route', {
  query: computed(() => ({
    fields: ROUTE_DETAIL_HEADER_FIELDS,
    filter: { [getIdFieldName()]: { _eq: routeId.value } },
  })),
  errorContext: 'Fetch Route',
})

useNotFoundGuard(loading, () => !!routeData.value?.data?.[0], 'Route not found', routeError)

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
  const routePath = routeData.value?.data?.[0]?.path || 'this route'
  const ok = await confirm({
    title: 'Delete Route',
    content: `Are you sure you want to delete route "${routePath}"? This action cannot be undone.`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
  })
  if (!ok) return

  await executeDeleteRoute({ id: routeId.value })
  if (deleteError.value) return

  notify.success('Success', 'Route deleted successfully')

  await retryUntilFresh(
    async () => {
      await loadRoutes()
    },
    () => routes.value.some((r: any) => String(getId(r)) === routeId.value),
  )

  const { registerDataMenuItemsFromRoutes } = useMenuRegistry()
  registerDataMenuItemsFromRoutes(routes.value)
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
</script>
