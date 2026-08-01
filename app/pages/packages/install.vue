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

          <div class="grid grid-cols-2 gap-4" role="radiogroup" aria-label="Package type">
            <div
              @click="packageType = 'Server'"
              role="radio"
              tabindex="0"
              :aria-checked="packageType === 'Server'"
              @keydown.enter.prevent="packageType = 'Server'"
              @keydown.space.prevent="packageType = 'Server'"
              :class="[
                'package-type-card group',
                packageType === 'Server' ? 'package-type-card-active shadow-theme-md' : '',
              ]"
            >
              <div class="flex items-start gap-4">
                <div
                  :class="[
                    'package-type-icon',
                    packageType === 'Server' ? 'package-type-icon-active' : '',
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
                  <p class="text-sm package-type-description">
                    Use in handlers & hooks via
                    <code class="package-type-code rounded px-1.5 py-0.5 text-xs font-mono">$ctx.$pkgs</code>
                  </p>
                </div>
              </div>
            </div>

            <div
              @click="packageType = 'App'"
              role="radio"
              tabindex="0"
              :aria-checked="packageType === 'App'"
              @keydown.enter.prevent="packageType = 'App'"
              @keydown.space.prevent="packageType = 'App'"
              :class="[
                'package-type-card group',
                packageType === 'App' ? 'package-type-card-active shadow-theme-md' : '',
              ]"
            >
              <div class="flex items-start gap-4">
                <div
                  :class="[
                    'package-type-icon',
                    packageType === 'App' ? 'package-type-icon-active' : '',
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
                  <p class="text-sm package-type-description">
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

const { ensureSchema, generateEmptyForm } = useSchema(tableName);
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

onMounted(async () => {
  await ensureSchema();
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

<style scoped>
.package-type-card {
  position: relative;
  cursor: pointer;
  border: 2px solid var(--border-strong);
  border-radius: var(--radius-card);
  background: var(--card-bg);
  padding: 1.25rem;
  color: var(--text-primary);
  transition: border-color 0.16s ease, background-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.package-type-card:hover {
  border-color: var(--border-accent);
  background: color-mix(in srgb, var(--state-primary-soft-bg) 28%, var(--card-bg));
}

.package-type-card-active {
  border-color: var(--badge-primary-soft-border);
  background: var(--badge-primary-soft-bg);
  color: var(--badge-primary-soft-text);
}

.package-type-card-active:hover {
  border-color: var(--border-accent);
  background: var(--state-primary-soft-bg-hover);
}

.package-type-icon {
  display: flex;
  width: 3rem;
  height: 3rem;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-control);
  background: var(--surface-muted);
  color: var(--text-secondary);
  transition: background-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.package-type-card:hover .package-type-icon {
  background: var(--state-primary-soft-bg);
  color: var(--badge-primary-soft-text);
  box-shadow: inset 0 0 0 1px var(--badge-primary-soft-border);
}

.package-type-icon-active,
.package-type-card-active:hover .package-type-icon-active {
  background: var(--action-primary-bg);
  color: var(--action-primary-text);
  box-shadow: none;
}

.package-type-description {
  color: color-mix(in srgb, var(--text-secondary) 90%, var(--badge-primary-soft-text));
}

.package-type-card-active .package-type-description {
  color: var(--badge-primary-soft-text);
}

.package-type-code {
  border: 1px solid var(--badge-primary-soft-border);
  background: color-mix(in srgb, var(--state-primary-soft-bg-hover) 74%, var(--surface-default));
  color: var(--badge-primary-soft-text);
}
</style>
