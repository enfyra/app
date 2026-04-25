<template>
  <div class="space-y-6">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
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
              connectionHandlerScript: {
                type: 'code',
                language: 'typescript',
                height: '400px',
                label: 'Connection Handler Script',
                description: 'TypeScript code to execute when client connects'
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

          <div
            class="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-[var(--border-subtle)] pt-6"
          >
            <UButton
              v-if="hasFormChanges"
              label="Reset"
              icon="lucide:rotate-ccw"
              variant="outline"
              color="warning"
              :disabled="!hasFormChanges"
              @click="handleReset"
            />
            <UButton
              v-if="canUpdateGateway"
              label="Save"
              icon="lucide:save"
              variant="solid"
              color="primary"
              type="submit"
              :loading="updateLoading"
              :disabled="!hasFormChanges"
            />
          </div>
        </UForm>
      </CommonFormCard>
    </div>

    <WebsocketConnectionHandlerTestModal
      v-model="showConnTestModal"
      :gateway-path="String(form?.path || gateway?.path || '')"
      :script="String(form?.connectionHandlerScript || '')"
      :timeout-ms="Number(form?.connectionHandlerTimeout || 5000)"
    />

    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
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

      <div v-if="events.length > 0" class="grid gap-4 grid-cols-1 md:grid-cols-2">
        <CommonSettingsCard
          v-for="event in events"
          :key="event.id"
          :title="event.eventName"
          :description="event.description || 'No description'"
          icon="lucide:zap"
          icon-color="warning"
          :card-class="'cursor-pointer'"
          @click="handleEditEvent(event)"
          :stats="[
            {
              label: 'Status',
              component: 'UBadge',
              props: {
                variant: 'soft',
                color: event.isEnabled ? 'success' : 'neutral',
              },
              value: event.isEnabled ? 'Active' : 'Inactive'
            }
          ]"
          :header-actions="[
            {
              component: 'USwitch',
              props: {
                'model-value': event.isEnabled,
              },
              onClick: (e?: Event) => e?.stopPropagation(),
              onUpdate: () => toggleEventStatus(event),
            }
          ]"
          :actions="[
            {
              label: 'Delete',
              props: {
                icon: 'lucide:trash-2',
                variant: 'solid',
                color: 'error',
                size: 'sm',
              },
              onClick: (e?: Event) => {
                e?.stopPropagation();
                deleteEvent(event);
              },
            }
          ]"
        />
      </div>

      <CommonEmptyState
        v-else
        title="No event handlers"
        description="No event handlers defined. Click 'Create Event' to add one."
        icon="lucide:zap-off"
        size="sm"
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
  </div>

  <CommonEmptyState
    v-if="!loading && !gatewayData?.data?.[0]"
    title="WebSocket gateway not found"
    description="The requested WebSocket gateway could not be loaded"
    icon="lucide:radio-tower"
    size="sm"
  />
</template>

<script setup lang="ts">
import WebsocketConnectionHandlerTestModal from '~/components/websocket/ConnectionHandlerTestModal.vue';

definePageMeta({
  layout: "default",
  title: "WebSocket Gateway Detail",
});

const route = useRoute();
const notify = useNotify();
const { confirm } = useConfirm();
const { getId, getIdFieldName } = useDatabase();

const tableName = "websocket_definition";

const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});
const hasFormChanges = ref(false);
const formEditorRef = ref();
const { useFormChanges } = useSchema();
const formChanges = useFormChanges();

const gateway = ref<any>(null);
const events = ref<any[]>([]);

const showEventDrawer = ref(false);
const selectedEvent = ref<any>(null);

const { validateForm } = useFormValidation(tableName);
const { registerPageHeader } = usePageHeaderRegistry();

const pageId = computed(() => route.params.id);

const showConnTestModal = ref(false);

registerPageHeader({
  title: "WebSocket Gateway",
  gradient: "cyan",
});

const {
  data: gatewayData,
  pending: loading,
  execute: fetchGateway,
} = useApi(() => `/websocket_definition`, {
  query: computed(() => ({
    fields: ["*"].join(","),
    filter:
        { [getIdFieldName()]: { _eq: pageId.value } },
    
  })),
  errorContext: "Fetch WebSocket Gateway",
});

const gatewayId = computed(() => getId(gatewayData.value?.data?.[0]));

const { data: eventsData, execute: fetchEvents } = useApi(() => "/websocket_event_definition", {
  query: computed(() => ({
    fields: ["*"].join(","),
    filter: gatewayId.value ? {
      gateway: { _eq: gatewayId.value },
    } : undefined,
  })),
  errorContext: "Fetch WebSocket Events",
});

const {
  data: updateData,
  error: updateError,
  execute: executeUpdate,
  pending: updateLoading,
} = useApi(() => `/websocket_definition`, {
  method: "patch",
  errorContext: "Update WebSocket Gateway",
});

const {
  error: deleteError,
  execute: executeDelete,
  pending: deleteLoading,
} = useApi(() => `/websocket_definition`, {
  method: "delete",
  errorContext: "Delete WebSocket Gateway",
});

const {
  error: toggleEventError,
  execute: executeToggleEvent,
} = useApi(() => `/websocket_event_definition`, {
  method: "patch",
  errorContext: "Toggle Event Status",
});

const {
  error: deleteEventError,
  execute: executeDeleteEvent,
} = useApi(() => `/websocket_event_definition`, {
  method: "delete",
  errorContext: "Delete Event",
});

const { checkPermissionCondition } = usePermissions();
const canUpdateGateway = computed(() =>
  checkPermissionCondition({
    and: [{ route: "/websocket_definition", actions: ["update"] }],
  })
);

useHeaderActionRegistry([
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
          route: "/websocket_definition",
          actions: ["delete"],
        },
      ],
    },
  },
]);

useSubHeaderActionRegistry([
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
    disabled: computed(() => !String(form.value?.connectionHandlerScript || '').trim()),
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
  await executeToggleEvent({
    id: eventId,
    body: { isEnabled: !event.isEnabled }
  });

  if (toggleEventError.value) {
    return;
  }

  notify.success("Success", `Event has been ${event.isEnabled ? 'disabled' : 'enabled'}.`);

  await fetchEvents();
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
