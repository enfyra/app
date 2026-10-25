<template>
  <div class="space-y-6">
    <div class="eapp-page-constrained">
      <CommonPanel :sections="[{ value: 'user' }]">
        <template #user-header><CommonFormHeader :title="'Create New User'" /></template>
        <template #user>
<CommonFormCard>
        <UForm :state="form" @submit="handleCreate">
          <FormEditorLazy
            v-model="form"
            v-model:errors="errors"
            :table-name="tableName"
            :excluded="['allowedRoutePermissions']"
            mode="create"
            @has-changed="(hasChanged) => (hasFormChanges = hasChanged)"
          />
        </UForm>
      </CommonFormCard>
        </template>
      </CommonPanel>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ShellCreatedRecordResponse } from '~/types/shell-api';

const { register: registerHeaderActions } = useHeaderActionRegistry();
const notify = useNotify();

const tableName = "enfyra_user";

const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});
const hasFormChanges = ref(false);
const { allowNextNavigation } = useUnsavedChangesGuard(() => hasFormChanges.value);

const { ensureSchema, generateEmptyForm } = useSchema(tableName);
const { validateForm } = useFormValidation(tableName);

const {
  data: createData,
  pending: createLoading,
  execute: createUser,
  error: createError,
} = useApi<ShellCreatedRecordResponse>(() => `/${tableName}`, {
  method: "post",
  errorContext: "Create User",
});

registerHeaderActions({
  id: "save-user",
  label: "Save",
  icon: "lucide:save",
  variant: "solid",
  color: "primary",
  order: 999,
  loading: computed(() => createLoading.value),
  submit: handleCreate,
  permission: {
    and: [
      {
        route: "/enfyra_user",
        methods: ["POST"],
      },
    ],
  },
});

onMounted(async () => {
  await ensureSchema();
  form.value = generateEmptyForm();
});

async function handleCreate() {
  if (!await validateForm(form.value, errors)) return;

  await createUser({ body: form.value });

  if (createError.value) {
    return;
  }

  notify.success("User created successfully");
  hasFormChanges.value = false;
  allowNextNavigation();

  const { getId } = useDatabase();
  await navigateTo(`/settings/users/${getId(createData.value?.data[0])}`, {
    replace: true,
  });
}
</script>
