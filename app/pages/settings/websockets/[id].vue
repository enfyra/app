<template>
  <div class="space-y-6">
    <div class="eapp-page-constrained">
      <CommonFormCard>
        <UForm :state="form" @submit="updateGateway">
          <FormEditorLazy
            ref="formEditorRef"
            v-model="form"
            v-model:errors="errors"
            @has-changed="(hasChanged) => hasFormChanges = hasChanged"
            :table-name="tableName"
            :excluded="['createdAt', 'updatedAt', 'isSystem', 'events']"
            :field-map="{
              sourceCode: {
                type: 'code',
                height: '400px',
                testRun: false,
                label: 'Connection Handler Script',
                description: 'JavaScript or TypeScript source code to execute when client connects'
              },
              connectionHandlerTimeout: {
                type: 'number',
                label: 'Connection Handler Timeout (ms)',
                description: 'Timeout for connection handler execution (default: 5000ms)',
                placeholder: '5000'
              }
            }"
            :loading="loading"
          />


        </UForm>
      </CommonFormCard>
    </div>

    <WebsocketConnectionHandlerTestModal
      v-model="showConnTestModal"
      :gateway-id="gatewayId"
      :gateway-path="String(form?.path || gateway?.path || '')"
      :script="String(form?.sourceCode || '')"
      :script-language="String(form?.scriptLanguage || 'typescript')"
      :timeout-ms="Number(form?.connectionHandlerTimeout || 5000)"
    />

    <div class="eapp-page-constrained">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-[var(--text-primary)]">Event Handlers</h3>
        <UButton
          icon="lucide:plus"
          size="sm"
          color="primary"
          variant="solid"
          @click="handleCreateEvent"
        >
          Create Event
        </UButton>
      </div>

      <DataTableSettingsTable
        :data="events"
        :columns="eventColumns"
        :actions="getEventActions"
        @row-click="handleEditEvent"
      />
    </div>

    <WebsocketEventEditorDrawer
      v-if="gatewayId"
      v-model="showEventDrawer"
      :event="selectedEvent"
      :gateway-id="gatewayId"
      :gateway-path="form?.path || gateway?.path || ''"
      @save="handleSaveEvent"
    />
    <CommonEmptyState
      v-if="!loading && !gatewayData?.data?.[0]"
      title="WebSocket gateway not found"
      description="The requested WebSocket gateway could not be loaded"
      icon="lucide:radio-tower"
      size="sm"
    />
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '@tanstack/vue-table';
import type { DataTableRowAction } from '~/types/data-table-columns';
import { settingsStatusColumn, settingsTextColumn } from '~/utils/settings-table';

const { register: registerSubHeaderActions } = useSubHeaderActionRegistry();
const { register: registerHeaderActions } = useHeaderActionRegistry();
definePageMeta({
  layout: "default",
  title: "WebSocket Gateway Detail",
});

const route = useRoute();
const notify = useNotify();
const { confirm } = useConfirm();
const { getId, getIdFieldName } = useDatabase();

const tableName = "enfyra_websocket";
const WEBSOCKET_EVENT_LIST_FIELDS = [
  "id",
  "eventName",
  "description",
  "isEnabled",
].join(",");

const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});
const hasFormChanges = ref(false);
const formEditorRef = ref();
const { useFormChanges } = useSchema();
const formChanges = useFormChanges();

const gateway = ref<any>(null);
const events = ref<any[]>([]);
const eventColumns: ColumnDef<Record<string, any>>[] = [
  settingsTextColumn('eventName', 'Event'),
  settingsTextColumn('description', 'Description'),
  settingsStatusColumn(),
];
function getEventActions(event: Record<string, any>): DataTableRowAction[] {
  return [
    { label: 'Edit', icon: 'lucide:pencil', onSelect: () => handleEditEvent(event) },
    { label: event.isEnabled ? 'Disable' : 'Enable', icon: 'lucide:power', disabled: togglingEventId.value === getId(event), onSelect: () => toggleEventStatus(event) },
    { label: 'Delete', icon: 'lucide:trash-2', color: 'error', onSelect: () => deleteEvent(event) },
  ];
}

const showEventDrawer = ref(false);
const selectedEvent = ref<any>(null);

const { validateForm } = useFormValidation(tableName);
const { registerPageHeader } = usePageHeaderRegistry();

const pageId = computed(() => {
  const id = route.params.id;
  return String(Array.isArray(id) ? id[0] ?? "" : id ?? "");
});

const showConnTestModal = ref(false);

registerPageHeader({
  title: "WebSocket Gateway",
  gradient: "cyan",
});

const {
  data: gatewayData,
  pending: loading,
  execute: fetchGateway,
} = useApi(() => `/enfyra_websocket`, {
  query: computed(() => ({
    fields: ["*"].join(","),
    filter:
        { [getIdFieldName()]: { _eq: pageId.value } },
    
  })),
  errorContext: "Fetch WebSocket Gateway",
});

const gatewayId = computed(() => pageId.value || getId(gatewayData.value?.data?.[0]));

const { data: eventsData, execute: fetchEvents } = useApi(() => "/enfyra_websocket_event", {
  query: computed(() => ({
    fields: WEBSOCKET_EVENT_LIST_FIELDS,
    limit: 0,
    filter: pageId.value ? {
      gateway: { _eq: pageId.value },
    } : undefined,
  })),
  errorContext: "Fetch WebSocket Events",
});

const {
  error: updateError,
  execute: executeUpdate,
  pending: updateLoading,
} = useApi(() => `/enfyra_websocket`, {
  method: "patch",
  errorContext: "Update WebSocket Gateway",
});

const {
  error: deleteError,
  execute: executeDelete,
  pending: deleteLoading,
} = useApi(() => `/enfyra_websocket`, {
  method: "delete",
  errorContext: "Delete WebSocket Gateway",
});

const {
  error: toggleEventError,
  execute: executeToggleEvent,
} = useApi(() => `/enfyra_websocket_event`, {
  method: "patch",
  errorContext: "Toggle Event Status",
});
const togglingEventId = ref<string | number | null>(null);

const {
  error: deleteEventError,
  execute: executeDeleteEvent,
} = useApi(() => `/enfyra_websocket_event`, {
  method: "delete",
  errorContext: "Delete Event",
});

const { checkPermissionCondition } = usePermissions();
const canUpdateGateway = computed(() =>
  checkPermissionCondition({
    and: [{ route: "/enfyra_websocket", methods: ["PATCH"] }],
  })
);

registerHeaderActions([
  {
    id: 'reset-websockets-settings',
    label: 'Reset',
    icon: 'lucide:rotate-ccw',
    variant: 'outline',
    color: 'warning',
    order: 998,
    show: computed(() => hasFormChanges.value),
    disabled: computed(() => updateLoading.value),
    onClick: handleReset,
  },
  {
    id: 'save-websockets-settings',
    label: 'Save',
    icon: 'lucide:save',
    color: 'primary',
    order: 999,
    show: canUpdateGateway,
    loading: computed(() => updateLoading.value),
    disabled: computed(() => !hasFormChanges.value || updateLoading.value),
    onClick: updateGateway,
  },
  {
    id: "delete-websocket",
    label: "Delete",
    icon: "lucide:trash",
    variant: "solid",
    color: "error",
    size: "md",
    order: 2,
    onClick: deleteGateway,
    loading: computed(() => deleteLoading.value),
    disabled: computed(() => gatewayData.value?.data?.[0]?.isSystem ?? false),
    permission: {
      and: [
        {
          route: "/enfyra_websocket",
          methods: ["DELETE"],
        },
      ],
    },
  },
]);

registerSubHeaderActions([
  {
    id: 'test-ws-connection',
    label: 'Test',
    icon: 'lucide:flask-conical',
    variant: 'soft',
    color: 'warning',
    side: 'right',
    order: 1,
    onClick: () => {
      showConnTestModal.value = true;
    },
    disabled: computed(() => !String(form.value?.sourceCode || '').trim()),
  },
]);

async function fetchGatewayDetail() {
  await Promise.all([fetchGateway(), fetchEvents()]);
}

watch(
  [() => gatewayData.value, () => eventsData.value, () => route.params.id],
  () => {
    if (gatewayData.value?.data?.[0]) {
      const data = gatewayData.value.data[0];
      gateway.value = data;
      form.value = { ...data };
      formChanges.update(data);
    }
    if (eventsData.value?.data) {
      events.value = eventsData.value.data;
    }
  },
  { immediate: true }
);

onMounted(async () => {
  await fetchGatewayDetail();
});

async function updateGateway() {
  if (!await validateForm(form.value, errors)) return;

  const body = {
    ...form.value,
  };

  await executeUpdate({ body, id: String(pageId.value) });

  if (updateError.value) {
    return;
  }

  hasFormChanges.value = false;
  formChanges.update(form.value);

  notify.success("Success", `WebSocket gateway has been updated successfully!`);

  await fetchGatewayDetail();

  await nextTick();
  if (formEditorRef.value?.confirmChanges) {
    formEditorRef.value.confirmChanges();
  }
  hasFormChanges.value = false;
}


async function handleReset() {
  const ok = await confirm({
    title: "Reset Changes",
    content: "Are you sure you want to discard all changes? All modifications will be lost.",
  });
  if (!ok) {
    return;
  }

  form.value = formChanges.discardChanges(form.value);
  hasFormChanges.value = false;

  notify.success("Reset Complete", "All changes have been discarded.");
}

async function deleteGateway() {
  const ok = await confirm({
    title: "Delete WebSocket Gateway",
    content: "Are you sure you want to delete this WebSocket gateway? This action cannot be undone.",
    confirmText: "Delete",
    cancelText: "Cancel",
  });

  if (!ok) return;

  await executeDelete({ id: String(pageId.value) });

  if (deleteError.value) {
    return;
  }

  notify.success("Success", "WebSocket gateway has been deleted successfully");

  await navigateTo("/settings/websockets");
}

async function toggleEventStatus(event: any) {
  const eventId = getId(event);
  togglingEventId.value = eventId;
  try {
    await executeToggleEvent({
      id: eventId,
      body: { isEnabled: !event.isEnabled }
    });

    if (toggleEventError.value) {
      return;
    }

    notify.success("Success", `Event has been ${event.isEnabled ? 'disabled' : 'enabled'}.`);

    if (eventsData.value?.data) {
      const idx = eventsData.value.data.findIndex((e: any) => getId(e) === eventId);
      if (idx !== -1) eventsData.value.data[idx].isEnabled = !event.isEnabled;
    }
  } finally {
    togglingEventId.value = null;
  }
}

async function deleteEvent(event: any) {
  const eventId = getId(event);
  const ok = await confirm({
    title: "Delete Event",
    content: `Are you sure you want to delete "${event.eventName}"?`,
    confirmText: "Delete",
    cancelText: "Cancel",
  });

  if (!ok) return;

  await executeDeleteEvent({ id: eventId });

  if (deleteEventError.value) {
    return;
  }

  notify.success("Success", `Event "${event.eventName}" has been deleted.`);

  await fetchEvents();
}

function handleCreateEvent() {
  selectedEvent.value = null;
  showEventDrawer.value = true;
}

function handleEditEvent(event: any) {
  selectedEvent.value = event;
  showEventDrawer.value = true;
}

async function handleSaveEvent() {
  await fetchEvents();
  showEventDrawer.value = false;
  selectedEvent.value = null;
}
</script>
