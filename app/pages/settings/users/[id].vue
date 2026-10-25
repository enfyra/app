<script setup lang="ts">
import type { ShellListResponse, ShellUserRecord } from '~/types/shell-api';

const { register: registerHeaderActions } = useHeaderActionRegistry();
const route = useRoute();
const notify = useNotify();
const { confirm } = useConfirm();
const { validateForm } = useFormValidation("enfyra_user");

const hasFormChanges = ref(false);
const formEditorRef = ref();
const { useFormChanges, getIncludeFields } = useSchema("enfyra_user");
const { getIdFieldName } = useDatabase();
const formChanges = useFormChanges();

const {
  data: apiData,
  pending: loading,
  execute: fetchUser,
} = useApi<ShellListResponse<ShellUserRecord>>(() => "/enfyra_user", {
  query: computed(() => ({
    fields: getIncludeFields(),
    filter: {
      [getIdFieldName()]: {
        _eq: route.params.id,
      },
    },
  })),
  errorContext: "Fetch User",
});

const form = ref<Record<string, any>>({});

const errors = ref<Record<string, string>>({});

async function initializeForm() {
  await fetchUser();
  const data = apiData.value?.data?.[0];
  if (data) {
    form.value = { ...data };
    formChanges.update(data);
  }
}

const {
  execute: updateUser,
  pending: updateLoading,
  error: updateError,
} = useApi(() => `/enfyra_user/${route.params.id}`, {
  method: "patch",
  errorContext: "Update User",
});

const {
  execute: removeUser,
  pending: deleteLoading,
  error: deleteError,
} = useApi(() => `/enfyra_user/${route.params.id}`, {
  method: "delete",
  errorContext: "Delete User",
});

async function handleReset() {
  const ok = await confirm({
    title: "Reset Changes",
    content: "Are you sure you want to discard all changes? All modifications will be lost.",
  });
  if (!ok) {
    return;
  }

  if (formChanges.originalData.value) {
    form.value = formChanges.discardChanges(form.value);
    errors.value = {};
    hasFormChanges.value = false;
    formEditorRef.value?.confirmChanges();
    
    notify.success("Reset Complete", "All changes have been discarded.");
  }
}

useUnsavedChangesGuard(() => hasFormChanges.value);

registerHeaderActions([
  {
    id: "reset-user",
    label: "Reset",
    icon: "lucide:rotate-ccw",
    variant: "outline",
    color: "warning",
    order: 1,
    disabled: computed(
      () =>
        loading.value ||
        updateLoading.value ||
        deleteLoading.value ||
        !hasFormChanges.value
    ),
    onClick: handleReset,
    show: computed(() => hasFormChanges.value),
  },
  {
    id: "delete-user",
    label: "Delete",
    icon: "lucide:trash",
    variant: "solid",
    color: "error",
    size: "md",
    order: 2,
    loading: computed(() => deleteLoading.value),
    disabled: computed(() => Boolean(apiData.value?.data?.[0]?.isRootAdmin || apiData.value?.data?.[0]?.isSystem)),
    onClick: deleteUser,
    permission: {
      and: [
        {
          route: "/enfyra_user",
          methods: ["DELETE"],
        },
      ],
    },
  },
  {
    id: "save-user",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    size: "md",
    order: 999,
    loading: computed(() => updateLoading.value),
    disabled: computed(() => !hasFormChanges.value),
    submit: saveUser,
    permission: {
      and: [
        {
          route: "/enfyra_user",
          methods: ["PATCH"],
        },
      ],
    },
  },
]);

async function saveUser() {
  if (!form.value) return;

  if (!await validateForm(form.value, errors)) return;

  await updateUser({ body: form.value });

  if (updateError.value) {
    return;
  }

  notify.success("Success", "User updated!");
  errors.value = {};
  hasFormChanges.value = false;

  await fetchUser();
  const freshData = apiData.value?.data?.[0];
  if (freshData) {
    form.value = { ...freshData };
    formChanges.update(freshData);
  }

  formEditorRef.value?.confirmChanges();
}

async function deleteUser() {
  const user = apiData.value?.data?.[0];
  const userIdentifier = user?.name || user?.username || user?.email || "this user";
  const ok = await confirm({
    title: "Delete User",
    content: `Are you sure you want to delete user "${userIdentifier}"? This action cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Cancel",
  });
  if (!ok) return;

  await removeUser();

  if (deleteError.value) {
    return;
  }

  hasFormChanges.value = false;
  notify.success("User deleted");
  await navigateTo("/settings/users");
}

registerHeaderActions(
  useReloadAction({
    reload: async () => { await initializeForm(); formEditorRef.value?.confirmChanges(); hasFormChanges.value = false; },
    loading: computed(() => loading.value),
    hasUnsavedChanges: () => hasFormChanges.value,
  }),
);

onMounted(() => {
  initializeForm();
});
</script>

<template>
  <div class="space-y-6">
    <div v-if="loading || apiData?.data?.[0]" class="eapp-page-constrained">
      <CommonPanel :sections="[{ value: 'user' }]">
        <template #user-header><CommonFormHeader :title="apiData?.data?.[0]?.email || 'User'" /></template>
        <template #user>
      <CommonFormCard>
        <UForm :state="form" @submit="saveUser">
          <FormEditorLazy
            ref="formEditorRef"
            v-model="form"
            v-model:errors="errors"
            @has-changed="(hasChanged) => hasFormChanges = hasChanged"
            table-name="enfyra_user"
            :excluded="['isRootAdmin', 'isSystem', 'allowedRoutePermissions']"
            :loading="loading"
          />
        </UForm>
      </CommonFormCard>
        </template>
      </CommonPanel>
    </div>

    <CommonEmptyState
      v-else
      title="User not found"
      description="The requested user could not be loaded"
      icon="lucide:user-x"
      size="sm"
    />
  </div>
</template>
