<template>
  <div class="space-y-6">
    <div class="max-w-[1000px] lg:max-w-[1000px] md:w-full">
      <CommonFormCard>
        <div class="mb-8">
          <div class="flex items-center justify-between mb-4">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Package Type</label>
            <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <UIcon name="lucide:info" class="w-3 h-3" />
              <span>Choose where to install the package</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div
              @click="packageType = 'Server'"
              :class="[
                'relative group cursor-pointer rounded-xl border-2 p-5 transition-all duration-200',
                packageType === 'Server'
                  ? 'border-secondary bg-gradient-to-br from-secondary/20 to-secondary/5 shadow-lg shadow-secondary/20'
                  : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/30 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50',
              ]"
            >
              <div class="flex items-start gap-4">
                <div
                  :class="[
                    'flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200',
                    packageType === 'Server'
                      ? 'bg-secondary/20 text-secondary'
                      : 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 group-hover:text-gray-700 dark:group-hover:text-gray-300',
                  ]"
                >
                  <UIcon name="lucide:server" class="w-6 h-6" />
                </div>

                <div class="flex-1 text-left">
                  <div class="flex items-center gap-2 mb-1">
                    <span
                      :class="[
                        'font-semibold text-base',
                        packageType === 'Server' ? 'text-gray-900 dark:text-white' : 'text-gray-900 dark:text-gray-200',
                      ]"
                    >
                      Server Package
                    </span>
                    <div
                      v-if="packageType === 'Server'"
                      class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/20 text-secondary text-xs font-medium"
                    >
                      <UIcon name="lucide:check" class="w-3 h-3" />
                      <span>Selected</span>
                    </div>
                  </div>
                  <p class="text-sm text-gray-700 dark:text-gray-400">
                    Use in handlers & hooks via
                    <code class="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-900/50 text-secondary text-xs font-mono">$ctx.$pkgs</code>
                  </p>
                </div>
              </div>
            </div>

            <div
              @click="packageType = 'App'"
              :class="[
                'relative group cursor-pointer rounded-xl border-2 p-5 transition-all duration-200',
                packageType === 'App'
                  ? 'border-secondary bg-gradient-to-br from-secondary/20 to-secondary/5 shadow-lg shadow-secondary/20'
                  : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/30 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50',
              ]"
            >
              <div class="flex items-start gap-4">
                <div
                  :class="[
                    'flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200',
                    packageType === 'App'
                      ? 'bg-secondary/20 text-secondary'
                      : 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 group-hover:text-gray-700 dark:group-hover:text-gray-300',
                  ]"
                >
                  <UIcon name="lucide:package-2" class="w-6 h-6" />
                </div>

                <div class="flex-1 text-left">
                  <div class="flex items-center gap-2 mb-1">
                    <span
                      :class="[
                        'font-semibold text-base',
                        packageType === 'App' ? 'text-gray-900 dark:text-white' : 'text-gray-900 dark:text-gray-200',
                      ]"
                    >
                      App Package
                    </span>
                    <div
                      v-if="packageType === 'App'"
                      class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/20 text-secondary text-xs font-medium"
                    >
                      <UIcon name="lucide:check" class="w-3 h-3" />
                      <span>Selected</span>
                    </div>
                  </div>
                  <p class="text-sm text-gray-700 dark:text-gray-400">
                    Use in extensions and components
                    <span class="text-gray-600 dark:text-gray-500">via import</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <UAlert
          v-if="packageType === 'Server'"
          icon="lucide:alert-triangle"
          title="Usage in Handlers & Hooks"
          description="Installed packages will be available as $ctx.$pkgs.packageName in your custom handlers and hooks."
          color="secondary"
          class="mb-6"
          :ui="{
            icon: 'text-[35px]',
          }"
          variant="soft"
        />

        <UAlert
          v-if="packageType === 'App'"
          icon="lucide:info"
          title="Frontend Packages"
          description="Packages will be installed in your Nuxt app and available in your extension."
          color="secondary"
          class="mb-6"
          :ui="{
            icon: 'text-[35px]',
          }"
          variant="soft"
        />

        <div class="mb-6">
          <div class="space-y-3">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Search NPM Package
            </label>

            <div class="relative">
              <NpmPackageSearch
                v-model="selectedNpmPackage"
                @select="handlePackageSelect"
                @clear="handlePackageClear"
                :disabled="createLoading"
                placeholder="Type to search packages (e.g., axios, lodash, dayjs...)"
              />
            </div>
          </div>
        </div>

        <UForm :state="form" @submit="handleCreate">
          <FormEditorLazy
            v-model="form"
            v-model:errors="errors"
            :table-name="tableName"
            :excluded="['type', 'installedBy', 'name']"
          />
        </UForm>
      </CommonFormCard>
    </div>
  </div>
</template>

<script setup lang="ts">
const toast = useToast();
const { me } = useEnfyraAuth();

const tableName = "package_definition";
const route = useRoute();
const packageType = ref<"App" | "Server">("Server");
const selectedNpmPackage = ref<any>(null);

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

const { registerPageHeader } = usePageHeaderRegistry();

registerPageHeader({
  title: "Install Package",
  gradient: "blue",
});

onMounted(() => {
  initializeForm();
  const queryType = route.query.type as string;
  if (queryType === 'app' || queryType === 'App') {
    packageType.value = 'App';
  } else if (queryType === 'server' || queryType === 'Server') {
    packageType.value = 'Server';
  }
});

watch(() => route.query.type, (newType) => {
  if (newType === 'app' || newType === 'App') {
    packageType.value = 'App';
  } else if (newType === 'server' || newType === 'Server') {
    packageType.value = 'Server';
  }
});

function initializeForm() {
  form.value = generateEmptyForm();

  const { getId } = useDatabase();
  const userId = getId(me.value);
  if (userId) {
    form.value.installedBy = {
      id: userId,
    };
  }
}

function handlePackageSelect(pkg: any) {
  if (!pkg) return;

  form.value.name = pkg.name;
  form.value.version = pkg.version;
  form.value.description = pkg.description || "";
}

function handlePackageClear() {
  initializeForm();
}

watch(packageType, () => {
  form.value.type = packageType.value;
});

async function handleCreate() {
  
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

  const { getId } = useDatabase();
  const packageId = getId(createData.value?.data?.[0]);

  if (packageType.value === 'App') {
    const { fetchAppPackages } = useGlobalState();
    await fetchAppPackages();
  }

  toast.add({
    title: "Package installed successfully",
    description: `${form.value.name} has been installed as a ${packageType.value} package`,
    color: "success",
  });

  await navigateTo(`/packages/${packageId}`, {
    replace: true,
  });
}
</script>
