<template>
  <div class="space-y-6">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <UForm :state="createForm" @submit="handleCreate">
          <FormEditorLazy
            v-model="createForm"
            :table-name="tableName"
            :errors="createErrors"
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
            @update:errors="(errors) => (createErrors = errors)"
            mode="create"
          />
        </UForm>
      </CommonFormCard>
    </div>

    <WebsocketConnectionHandlerTestModal
      v-model="showConnTestModal"
      :gateway-path="String(createForm?.path || '')"
      :script="String(createForm?.sourceCode || '')"
      :script-language="String(createForm?.scriptLanguage || 'typescript')"
      :timeout-ms="Number(createForm?.connectionHandlerTimeout || 5000)"
    />

  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
  title: "Create WebSocket Gateway",
});

const notify = useNotify();
const router = useRouter();
const { createLoader } = useLoader();
const { confirm } = useConfirm();

const tableName = "websocket_definition";

const createForm = ref<Record<string, any>>({});
const createErrors = ref<Record<string, string>>({});
const showConnTestModal = ref(false);

const { generateEmptyForm } = useSchema(tableName);
const { validateForm } = useFormValidation(tableName);
const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Create New WebSocket Gateway",
  gradient: "cyan",
});

useHeaderActionRegistry([
  {
    id: "save-websocket",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    submit: handleCreate,
    loading: computed(() => createLoading.value),
    order: 999,
    permission: {
      and: [
        {
          route: "/websocket_definition",
          actions: ["create"],
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
    disabled: computed(() => !String(createForm.value?.sourceCode || '').trim()),
  },
]);

const {
  error: createError,
  execute: executeCreateGateway,
  pending: createLoading,
} = useApi(() => `/websocket_definition`, {
  method: "post",
  errorContext: "Create WebSocket Gateway",
});

onMounted(async () => {
  createForm.value = generateEmptyForm();
});

async function handleCreate() {
  if (!await validateForm(createForm.value, createErrors)) return;

  const body = {
    ...createForm.value,
  };

  await executeCreateGateway({ body });

  if (createError.value) {
    return;
  }

  notify.success("Success", `WebSocket gateway "${createForm.value.path}" has been created successfully!`);

  router.push('/settings/websockets');
}
</script>
