<template>
  <div class="space-y-6">
    <div class="eapp-page-constrained">
      <CommonFormCard>
        <div class="mb-8">
          <div class="flex items-center justify-between mb-4">
            <label class="text-sm font-medium text-[var(--text-secondary)]">Package Type</label>
            <div class="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
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
                  ? 'eapp-accent-soft shadow-theme-md'
                  : 'border-[var(--border-strong)] bg-[var(--surface-default)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]',
              ]"
            >
              <div class="flex items-start gap-4">
                <div
                  :class="[
                    'flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200',
                    packageType === 'Server'
                      ? 'eapp-accent-solid'
                      : 'bg-[var(--surface-muted)] text-[var(--text-tertiary)] group-hover:bg-[var(--surface-muted)] group-hover:text-[var(--text-secondary)]',
                  ]"
                >
                  <UIcon name="lucide:server" class="w-6 h-6" />
                </div>

                <div class="flex-1 text-left">
                  <div class="flex items-center gap-2 mb-1">
                    <span
                      :class="[
                        'font-semibold text-base',
                        packageType === 'Server' ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)]',
                      ]"
                    >
                      Server Package
                    </span>
                    <div
                      v-if="packageType === 'Server'"
                      class="eapp-accent-solid flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                    >
                      <UIcon name="lucide:check" class="w-3 h-3" />
                      <span>Selected</span>
                    </div>
                  </div>
                  <p class="text-sm text-[var(--text-secondary)]">
                    Use in handlers & hooks via
                    <code class="eapp-accent-soft rounded px-1.5 py-0.5 text-xs font-mono">$ctx.$pkgs</code>
                  </p>
                </div>
              </div>
            </div>

            <div
              @click="packageType = 'App'"
              :class="[
                'relative group cursor-pointer rounded-xl border-2 p-5 transition-all duration-200',
                packageType === 'App'
                  ? 'eapp-accent-soft shadow-theme-md'
                  : 'border-[var(--border-strong)] bg-[var(--surface-default)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]',
              ]"
            >
              <div class="flex items-start gap-4">
                <div
                  :class="[
                    'flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200',
                    packageType === 'App'
                      ? 'eapp-accent-solid'
                      : 'bg-[var(--surface-muted)] text-[var(--text-tertiary)] group-hover:bg-[var(--surface-muted)] group-hover:text-[var(--text-secondary)]',
                  ]"
                >
                  <UIcon name="lucide:package-2" class="w-6 h-6" />
                </div>

                <div class="flex-1 text-left">
                  <div class="flex items-center gap-2 mb-1">
                    <span
                      :class="[
                        'font-semibold text-base',
                        packageType === 'App' ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)]',
                      ]"
                    >
                      App Package
                    </span>
                    <div
                      v-if="packageType === 'App'"
                      class="eapp-accent-solid flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                    >
                      <UIcon name="lucide:check" class="w-3 h-3" />
                      <span>Selected</span>
                    </div>
                  </div>
                  <p class="text-sm text-[var(--text-secondary)]">
                    Use in extensions and components
                    <span class="text-[var(--text-tertiary)]">via import</span>
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
          color="primary"
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
          color="primary"
          class="mb-6"
          :ui="{
            icon: 'text-[35px]',
          }"
          variant="soft"
        />

        <div class="mb-6">
          <div class="space-y-3">
            <label class="block text-sm font-medium text-[var(--text-secondary)]">
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
            :excluded="['type', 'installedBy', 'name', 'status', 'lastError']"
          />
        </UForm>
      </CommonFormCard>
    </div>
  </div>
</template>

<script setup lang="ts">
const { register: registerHeaderActions } = useHeaderActionRegistry();
const { me } = useAuth();
const { fetchAppPackages } = useGlobalState();

const tableName = "enfyra_package";
const route = useRoute();
const packageType = ref<"App" | "Server">("Server");
const selectedNpmPackage = ref<any>(null);

const form = ref<Record<string, any>>({});
const errors = ref<Record<string, string>>({});

const { generateEmptyForm } = useSchema(tableName);
const { validateForm } = useFormValidation(tableName);

const {
  data: createData,
  pending: createLoading,
  execute: createPackage,
  error: createError,
} = useApi(`/${tableName}`, {
  method: "post",
  errorContext: "Install Package",
});

registerHeaderActions({
  id: "save-package",
  label: "Install",
  icon: "lucide:download",
  variant: "solid",
  color: "primary",
  order: 999,
  loading: computed(() => createLoading.value),
  submit: handleCreate,
  permission: {
    and: [
      {
        route: "/enfyra_package",
        methods: ["POST"],
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

  const { getId, getIdFieldName } = useDatabase();
  const userId = getId(me.value);
  if (userId) {
    form.value.installedBy = {
      [getIdFieldName()]: userId,
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

  if (!await validateForm(form.value, errors)) return;

  await createPackage({ body: form.value });

  if (createError.value) {
    return;
  }

  const { getId } = useDatabase();
  const packageId = getId(createData.value?.data?.[0]);

  if (packageType.value === 'App') {
    await fetchAppPackages();
  }

  await navigateTo(`/packages/${packageId}`, {
    replace: true,
  });
}
</script>
