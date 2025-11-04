<template>
  <div class="space-y-6">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <!-- Usage Instructions (Backend only) -->
      <UAlert
        v-if="packageData?.type === 'Backend'"
        icon="lucide:code-2"
        title="Usage in Handlers & Hooks"
        color="info"
        variant="soft"
        class="mb-6"
      >
        <template #description>
          <div class="space-y-2">
            <p>
              This package is available in your custom handlers and hooks as:
            </p>
            <code
              class="block bg-gray-800 text-green-400 p-3 rounded-lg font-mono text-sm"
            >
              $ctx.$pkgs.{{ packageData?.name.replace(/[@\/\-]/g, "") }}
            </code>
          </div>
        </template>
      </UAlert>

      <!-- Form -->
      <div class="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <UForm :state="form" @submit="handleUpdate">
          <FormEditorLazy
            v-model="form"
            v-model:errors="errors"
            :table-name="tableName"
            :loading="loading"
            :excluded="['installedBy', 'type']"
            :type-map="{
              name: {
                disabled: true,
              },
            }"
          />
        </UForm>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const toast = useToast();
const { confirm } = useConfirm();
const packageId = route.params.id as string;
const tableName = "package_definition";

const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});

const { validate } = useSchema(tableName);

// Fetch package data
const {
  data: apiData,
  pending: loading,
  execute: loadPackage,
} = useApi("/package_definition", {
  query: {
    fields: "*",
    filter: {
      id: { _eq: packageId },
    },
  },
  errorContext: "Load Package Details",
});

const packageData = computed(() => apiData.value?.data?.[0]);

// Update API
const {
  execute: updatePackage,
  pending: updating,
  error: updateError,
} = useApi("/package_definition", {
  method: "patch",
  errorContext: "Update Package",
});

const {
  execute: removePackage,
  pending: deleting,
  error: deleteError,
} = useApi("/package_definition", {
  method: "delete",
  errorContext: "Uninstall Package",
});

useHeaderActionRegistry({
  id: "save-package",
  label: "Save",
  icon: "lucide:save",
  variant: "solid",
  color: "primary",
  loading: computed(() => updating.value),
  submit: handleUpdate,
  permission: {
    and: [
      {
        route: "/package_definition",
        actions: ["update"],
      },
    ],
  },
});

useHeaderActionRegistry({
  id: "uninstall-package",
  label: "Uninstall",
  icon: "lucide:trash-2",
  variant: "solid",
  color: "error",
  loading: computed(() => deleting.value),
  submit: handleUninstall,
  permission: {
    and: [
      {
        route: "/package_definition",
        actions: ["delete"],
      },
    ],
  },
});

// Initialize form when data loads
watch(packageData, (data) => {
  if (data) {
    form.value = { ...data };
  }
});

async function handleUpdate() {
  const { isValid, errors: validationErrors } = validate(form.value);
  errors.value = validationErrors;

  if (!isValid) {
    toast.add({
      title: "Invalid data",
      description: "Please check the fields with errors.",
      color: "error",
    });
    return;
  }

  const isConfirmed = await confirm({
    title: "Update Package",
    content: "Are you sure you want to update this package?",
    confirmText: "Update",
    cancelText: "Cancel",
  });

  if (!isConfirmed) return;

  await updatePackage({ id: packageId, body: form.value });

  if (updateError.value) {
    return;
  }

  toast.add({
    title: "Success",
    description: "Package updated successfully",
    color: "success",
  });

  await loadPackage();
}

async function handleUninstall() {
  const isConfirmed = await confirm({
    title: "Uninstall Package",
    content: `Are you sure you want to uninstall "${packageData.value?.name}"? This action cannot be undone.`,
    confirmText: "Uninstall",
    cancelText: "Cancel",
  });

  if (!isConfirmed) return;

  await removePackage({ id: packageId });

  if (deleteError.value) {
    return;
  }

  toast.add({
    title: "Success",
    description: `Package ${packageData.value?.name} uninstalled successfully`,
    color: "success",
  });

  // Navigate back to the appropriate package list
  const packageType = packageData.value?.type;
  await navigateTo(`/packages/${packageType.toLowerCase()}`, {
    replace: true,
  });
}

const { registerPageHeader } = usePageHeaderRegistry();

watch(packageData, (data) => {
  if (data) {
    registerPageHeader({
      title: data.name || 'Package Details',
      gradient: data.type === 'Backend' ? 'cyan' : 'blue',
    });
  }
}, { immediate: true });

onMounted(() => {
  loadPackage();
});
</script>
