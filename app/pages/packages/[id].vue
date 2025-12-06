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
          <div class="space-y-4">
            <div class="space-y-2">
              <p class="font-medium">In JavaScript/TypeScript code:</p>
              <code
                class="block bg-gray-800 text-green-400 p-3 rounded-lg font-mono text-sm"
              >
                $ctx.$pkgs{{ packageData?.name && /[@\/\-]/.test(packageData.name) ? `['${packageData.name}']` : `.${packageData?.name.replace(/[@\/\-]/g, "")}` }}
              </code>
            </div>
            <div class="space-y-2">
              <p class="font-medium">In template syntax:</p>
              <code
                class="block bg-gray-800 text-green-400 p-3 rounded-lg font-mono text-sm"
              >
                @PKGS{{ packageData?.name && /[@\/\-]/.test(packageData.name) ? `['${packageData.name}']` : `.${packageData?.name.replace(/[@\/\-]/g, "")}` }}
              </code>
            </div>
          </div>
        </template>
      </UAlert>

      <!-- Form -->
      <div class="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <UForm :state="form" @submit="handleUpdate">
          <FormEditorLazy
            ref="formEditorRef"
            table-name="package_definition"
            mode="update"
            v-model="form"
            v-model:errors="errors"
            @has-changed="(hasChanged) => hasFormChanges = hasChanged"
            :loading="loading"
            :excluded="['installedBy', 'type']"
            :field-map="{
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

const hasFormChanges = ref(false);
const formEditorRef = ref();
const { validate, useFormChanges } = useSchema(tableName);
const formChanges = useFormChanges();

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
    hasFormChanges.value = false;
    formEditorRef.value?.confirmChanges();
    
    toast.add({
      title: "Reset Complete",
      color: "success",
      description: "All changes have been discarded.",
    });
  }
}

useHeaderActionRegistry([
  {
    id: "reset-package",
    label: "Reset",
    icon: "lucide:rotate-ccw",
    variant: "outline",
    color: "warning",
    disabled: computed(() => !hasFormChanges.value),
    onClick: handleReset,
    show: computed(() => hasFormChanges.value),
  },
  {
    id: "save-package",
    label: "Save",
    icon: "lucide:save",
    variant: "solid",
    color: "primary",
    size: "md",
    submit: handleUpdate,
    loading: computed(() => updating.value),
    disabled: computed(() => !hasFormChanges.value),
    permission: {
      and: [
        {
          route: "/package_definition",
          actions: ["update"],
        },
      ],
    },
  },
  {
    id: "uninstall-package",
    label: "Uninstall",
    icon: "lucide:trash-2",
    variant: "solid",
    color: "error",
    size: "md",
    onClick: handleUninstall,
    loading: computed(() => deleting.value),
    permission: {
      and: [
        {
          route: "/package_definition",
          actions: ["delete"],
        },
      ],
    },
  },
]);

async function initializeForm() {
  await loadPackage();
  const data = packageData.value;
  form.value = data ? { ...data } : {};
  if (data) {
    formChanges.update(data);
  }
}

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

  formEditorRef.value?.confirmChanges();
  formChanges.update(form.value);
  
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
  initializeForm();
});
</script>
