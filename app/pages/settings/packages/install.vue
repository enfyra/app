<template>
  <div class="space-y-6">
    <!-- Header -->
    <CommonPageHeader
      title="Install Package"
      title-size="lg"
      show-background
      background-gradient="from-indigo-500/8 via-purple-400/5 to-transparent"
      padding-y="py-6"
    />

    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <div class="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <!-- Package Type Selector -->
        <div class="mb-6">
          <label class="block text-sm font-medium mb-2">Package Type</label>
          <div class="grid grid-cols-2 gap-4">
            <button
              @click="packageType = 'Backend'"
              :class="[
                'p-4 rounded-lg border-2 transition-all',
                packageType === 'Backend'
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-600 hover:border-gray-500',
              ]"
            >
              <UIcon
                name="lucide:server"
                class="w-8 h-8 mb-2"
                :class="
                  packageType === 'Backend' ? 'text-primary' : 'text-gray-400'
                "
              />
              <div class="font-semibold">Backend Package</div>
              <div class="text-sm text-gray-400">
                Server-side packages for handlers & hooks
              </div>
            </button>

            <button
              @click="packageType = 'App'"
              :class="[
                'p-4 rounded-lg border-2 transition-all',
                packageType === 'App'
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-600 hover:border-gray-500',
              ]"
            >
              <UIcon
                name="lucide:package-2"
                class="w-8 h-8 mb-2"
                :class="
                  packageType === 'App' ? 'text-primary' : 'text-gray-400'
                "
              />
              <div class="font-semibold">App Package</div>
              <div class="text-sm text-gray-400">
                Frontend packages for your application
              </div>
            </button>
          </div>
        </div>

        <!-- Usage Note -->
        <UAlert
          v-if="packageType === 'Backend'"
          icon="lucide:alert-triangle"
          title="Usage in Handlers & Hooks"
          description="Installed packages will be available as $ctx.$pkgs.packageName in your custom handlers and hooks."
          color="warning"
          class="my-6"
          :ui="{
            icon: 'text-[35px]',
          }"
          variant="soft"
        />

        <!-- Form -->
        <UForm :state="form" @submit="handleCreate">
          <FormEditorLazy
            v-model="form"
            v-model:errors="errors"
            :table-name="tableName"
            :excluded="['type', 'installedBy']"
          />
        </UForm>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const toast = useToast();
const { me } = useEnfyraAuth();

const tableName = "package_definition";
const packageType = ref<"App" | "Backend">("Backend");

const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});

const { generateEmptyForm, validate } = useSchema(tableName);

const {
  data: createData,
  pending: createLoading,
  execute: createPackage,
  error: createError,
} = useApi(`/${tableName}`, {
  method: "post",
  errorContext: "Install Package",
});

useHeaderActionRegistry({
  id: "save-package",
  label: "Install",
  icon: "lucide:download",
  variant: "solid",
  color: "primary",
  loading: computed(() => createLoading.value),
  submit: handleCreate,
  permission: {
    and: [
      {
        route: "/package_definition",
        actions: ["create"],
      },
    ],
  },
});

onMounted(() => {
  initializeForm();
});

function initializeForm() {
  form.value = generateEmptyForm();

  if (me.value?.id) {
    form.value.installedBy = {
      id: me.value.id,
    };
  }
}

// Watch package type changes to update form
watch(packageType, () => {
  form.value.type = packageType.value;
});

async function handleCreate() {
  // Set the type based on selection
  form.value.type = packageType.value;

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

  await createPackage({ body: form.value });

  if (createError.value) {
    return;
  }

  const packageId = createData.value?.data?.[0].id;

  toast.add({
    title: "Package installed successfully",
    description: `${form.value.name} has been installed as a ${packageType.value} package`,
    color: "success",
  });

  // Navigate to the package detail page
  await navigateTo(`/settings/packages/${packageId}`, {
    replace: true,
  });
}
</script>
