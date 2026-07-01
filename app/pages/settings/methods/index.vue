<script setup lang="ts">
const { register: registerHeaderActions } = useHeaderActionRegistry();
import {
  getMethodColors,
  getMethodLabel,
  getSuggestedMethodColors,
  isHexColor,
  normalizeMethodName,
  type MethodColorRecord,
} from '~/utils/http.constants';

type MethodRecord = MethodColorRecord & {
  id?: string | number;
  isSystem?: boolean;
};

const METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const CUSTOM_METHOD_RE = /^[A-Z][A-Z0-9_]*$/;

const notify = useNotify();
const route = useRoute();
const router = useRouter();
const { confirm } = useConfirm();
const { registerPageHeader } = usePageHeaderRegistry();
const { getId } = useDatabase();

registerPageHeader({
  title: 'Method Manager',
  description: 'Manage route methods and their badge colors.',
  gradient: 'purple',
});

const drawerOpen = ref(false);
const mode = ref<'create' | 'edit'>('create');
const saving = ref(false);
const customMethod = ref(false);
const closingDrawer = ref(false);
const initialForm = ref({
  id: null as string | number | null,
  name: '',
  buttonColor: '',
  textColor: '',
  isSystem: false,
  customMethod: false,
});
const form = reactive({
  id: null as string | number | null,
  name: '',
  buttonColor: '',
  textColor: '',
  isSystem: false,
});

const {
  data: methodsData,
  pending: loading,
  execute: fetchMethods,
} = useApi<{ data: MethodRecord[] }>('/enfyra_method', {
  query: {
    fields: '*',
    sort: 'name',
    limit: 0,
  },
  errorContext: 'Fetch Methods',
});

const { execute: createMethod } = useApi('/enfyra_method', {
  method: 'post',
  errorContext: 'Create Method',
  disableErrorPage: true,
});

const { execute: updateMethod } = useApi('/enfyra_method', {
  method: 'patch',
  errorContext: 'Update Method',
  disableErrorPage: true,
});

const {
  items: methods,
  showInitialLoading,
  isRefreshing: methodsRefreshing,
} = useStableListState(() => methodsData.value?.data, () => loading.value);
const methodNames = computed(() => new Set(methods.value.map((method) => getMethodLabel(method))));
const currentMethodLabel = computed(() => normalizeMethodName(form.name));
const canEditMethodName = computed(() => mode.value === 'create' || !form.isSystem);
const methodError = computed(() => {
  const method = currentMethodLabel.value;
  if (!method) return 'Select a method.';
  if (!CUSTOM_METHOD_RE.test(method)) {
    return 'Use uppercase letters, numbers, or underscore. The first character must be a letter.';
  }
  const duplicate = methodNames.value.has(method) && (mode.value === 'create' || method !== form.name);
  if (duplicate) return `${method} already exists.`;
  return null;
});
const colorError = computed(() => {
  if (!isHexColor(form.buttonColor) || !isHexColor(form.textColor)) {
    return 'Button and text colors must be full hex values.';
  }
  return null;
});
const visibleMethodError = computed(() => customMethod.value ? methodError.value : null);
const visibleColorError = computed(() => methodError.value ? null : colorError.value);

const formError = computed(() => {
  return methodError.value || colorError.value;
});

const canSave = computed(() => !saving.value && !formError.value);
const hasUnsavedChanges = computed(() => (
  form.id !== initialForm.value.id ||
  form.name !== initialForm.value.name ||
  form.buttonColor !== initialForm.value.buttonColor ||
  form.textColor !== initialForm.value.textColor ||
  form.isSystem !== initialForm.value.isSystem ||
  customMethod.value !== initialForm.value.customMethod
));

const visibleMethodOptions = computed(() => {
  if (mode.value === 'edit') return METHOD_OPTIONS;
  return METHOD_OPTIONS.filter((method) => !methodNames.value.has(method));
});

function resetForm() {
  form.id = null;
  form.name = '';
  form.buttonColor = '';
  form.textColor = '';
  form.isSystem = false;
  customMethod.value = false;
}

function snapshotForm() {
  initialForm.value = {
    id: form.id,
    name: form.name,
    buttonColor: form.buttonColor,
    textColor: form.textColor,
    isSystem: form.isSystem,
    customMethod: customMethod.value,
  };
}

function applySuggestedColors(method: string) {
  const suggested = getSuggestedMethodColors(method);
  form.buttonColor = suggested.buttonColor;
  form.textColor = suggested.textColor;
}

function selectMethod(method: string) {
  if (!canEditMethodName.value) return;
  form.name = method;
  customMethod.value = false;
  applySuggestedColors(method);
}

function selectCustomMethod() {
  if (!canEditMethodName.value) return;
  customMethod.value = true;
  if (!isHexColor(form.buttonColor) || !isHexColor(form.textColor)) {
    applySuggestedColors(form.name || 'CUSTOM');
  }
}

function openCreate() {
  mode.value = 'create';
  resetForm();
  snapshotForm();
  drawerOpen.value = true;
}

function openEdit(method: MethodRecord) {
  const colors = getMethodColors(method);
  mode.value = 'edit';
  form.id = getId(method);
  form.name = getMethodLabel(method);
  form.buttonColor = colors.buttonColor;
  form.textColor = colors.textColor;
  form.isSystem = Boolean(method.isSystem);
  customMethod.value = !METHOD_OPTIONS.includes(form.name);
  snapshotForm();
  drawerOpen.value = true;
}

async function closeDrawer(force = false) {
  if (closingDrawer.value) return;

  if (!force && hasUnsavedChanges.value) {
    const ok = await confirm({
      title: 'Discard changes?',
      content: 'You have unsaved changes. Are you sure you want to close? All changes will be lost.',
      confirmText: 'Discard',
      cancelText: 'Keep editing',
    });
    if (!ok) return;
  }

  closingDrawer.value = true;
  drawerOpen.value = false;
  if (route.query.create === 'true') {
    const query = { ...route.query };
    delete query.create;
    await router.replace({ query });
  }
  await nextTick();
  closingDrawer.value = false;
}

async function handleDrawerOpenChange(value: boolean) {
  if (closingDrawer.value) return;
  if (value) {
    drawerOpen.value = true;
    return;
  }
  await closeDrawer();
}

async function saveMethod() {
  if (!canSave.value) return;
  saving.value = true;
  try {
    const body: Record<string, any> = {
      buttonColor: form.buttonColor.toLowerCase(),
      textColor: form.textColor.toLowerCase(),
    };

    if (canEditMethodName.value) {
      body.name = currentMethodLabel.value;
    }
    if (mode.value === 'create') {
      body.isSystem = false;
    }

    const response = mode.value === 'create'
      ? await createMethod({ body })
      : await updateMethod({ id: form.id || undefined, body });

    if (!response) return;
    notify.success('Success', `Method ${mode.value === 'create' ? 'created' : 'updated'} successfully.`);
    await fetchMethods();
    snapshotForm();
    await closeDrawer(true);
  } finally {
    saving.value = false;
  }
}

function isMethodSelected(method: string) {
  return currentMethodLabel.value === method;
}

function methodSwatches(method: MethodRecord) {
  const colors = getMethodColors(method);
  return [
    { key: 'button', label: 'Button', value: colors.buttonColor },
    { key: 'text', label: 'Text', value: colors.textColor },
  ];
}

function normalizeCustomMethodInput(value: string) {
  form.name = normalizeMethodName(value);
}

registerHeaderActions([
  {
    id: 'create-method',
    label: 'New Method',
    icon: 'lucide:plus',
    variant: 'solid',
    color: 'primary',
    size: 'md',
    onClick: openCreate,
    permission: {
      and: [
        {
          route: '/enfyra_method',
          methods: ['POST'],
        },
      ],
    },
  },
]);

onMounted(async () => {
  await fetchMethods();
  if (route.query.create === 'true') {
    openCreate();
  }
});

watch(
  () => route.query.create,
  (value) => {
    if (value === 'true' && !drawerOpen.value) {
      openCreate();
    }
  },
);
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)]">
      <div v-if="showInitialLoading" class="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
        <USkeleton v-for="i in 6" :key="i" class="h-32 rounded-xl" />
      </div>

      <div v-else-if="!methods.length" class="p-5">
        <div class="rounded-lg border border-dashed border-[var(--border-strong)] p-6 text-center">
          <p class="font-medium text-[var(--text-primary)]">No methods found</p>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">
            Create the first method to make it selectable in route forms.
          </p>
          <UButton class="mt-4" icon="lucide:plus" @click="openCreate">
            New Method
          </UButton>
        </div>
      </div>

      <div v-else class="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
        <button
          v-for="method in methods"
          :key="getId(method) || getMethodLabel(method)"
          type="button"
          class="surface-card-hover group relative flex flex-col gap-4 rounded-xl p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-focus-ring)]"
          :class="methodsRefreshing ? 'opacity-75' : ''"
          @click="openEdit(method)"
        >
          <div class="flex items-center justify-between gap-2">
            <MethodBadge :method="method" size="sm" />
            <UBadge
              :color="method.isSystem ? 'neutral' : 'primary'"
              variant="soft"
              size="sm"
            >
              {{ method.isSystem ? 'System' : 'Custom' }}
            </UBadge>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div
              v-for="sw in methodSwatches(method)"
              :key="sw.key"
              class="flex min-w-0 items-center gap-2.5"
            >
              <span
                class="size-8 shrink-0 rounded-lg ring-1 ring-inset ring-[var(--border-default)]"
                :style="{ backgroundColor: sw.value }"
              />
              <div class="min-w-0">
                <p class="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  {{ sw.label }}
                </p>
                <p class="truncate font-mono text-xs text-[var(--text-primary)]">
                  {{ sw.value }}
                </p>
              </div>
            </div>
          </div>

          <div
            class="mt-auto flex items-center gap-1 text-[var(--text-tertiary)] opacity-0 transition group-hover:opacity-100"
          >
            <UIcon name="lucide:pencil" class="size-3.5" />
            <span class="text-xs font-medium">Edit</span>
          </div>
        </button>
      </div>
    </div>

    <CommonDrawer
      :model-value="drawerOpen"
      direction="right"
      :cancel-action="{ label: 'Cancel', onClick: closeDrawer }"
      :primary-action="{
        label: mode === 'create' ? 'Create method' : 'Save changes',
        icon: 'lucide:save',
        loading: saving,
        disabled: !canSave,
        onClick: saveMethod,
      }"
      @update:model-value="handleDrawerOpenChange"
    >
      <template #header>
        <div class="flex items-center gap-3">
          <div class="flex size-12 items-center justify-center rounded-xl bg-[var(--state-primary-soft-bg)] text-[var(--state-primary-soft-text)] ring-1 ring-inset ring-[var(--state-primary-outline-border)]">
            <UIcon name="lucide:badge" class="size-6" />
          </div>
          <div>
            <h2 class="text-xl font-semibold text-[var(--text-primary)]">
              {{ mode === 'create' ? 'Create method' : 'Edit method' }}
            </h2>
            <p class="text-sm text-[var(--text-secondary)]">
              {{ mode === 'create' ? 'Pick a method and assign its badge colors.' : 'Adjust the method colors used across the Enfyra admin app.' }}
            </p>
          </div>
        </div>
      </template>

      <template #body>
        <div class="space-y-6">
          <section>
            <div class="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 class="font-semibold text-[var(--text-primary)]">Method</h3>
                <p class="text-sm text-[var(--text-secondary)]">
                  Select a common HTTP method. Use custom only when the preset list does not fit.
                </p>
              </div>
              <MethodBadge
                v-if="currentMethodLabel"
                :method="{ name: currentMethodLabel, buttonColor: form.buttonColor, textColor: form.textColor }"
              />
            </div>

            <div class="flex flex-wrap gap-2">
              <button
                v-for="method in visibleMethodOptions"
                :key="method"
                type="button"
                :disabled="!canEditMethodName"
                class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                :class="isMethodSelected(method) ? 'border-[var(--state-primary-outline-border)] bg-[var(--state-primary-soft-bg)] text-[var(--state-primary-soft-text)]' : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]'"
                @click="selectMethod(method)"
              >
                {{ method }}
                <UIcon
                  :name="isMethodSelected(method) ? 'lucide:check' : 'lucide:circle'"
                  class="size-4"
                  :class="isMethodSelected(method) ? '' : 'opacity-45'"
                />
              </button>
              <button
                type="button"
                :disabled="!canEditMethodName"
                class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                :class="customMethod ? 'border-[var(--state-primary-outline-border)] bg-[var(--state-primary-soft-bg)] text-[var(--state-primary-soft-text)]' : 'border-dashed border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]'"
                @click="selectCustomMethod"
              >
                <UIcon name="lucide:plus" class="size-4" />
                Custom
              </button>
            </div>

            <UInput
              v-if="customMethod"
              v-model="form.name"
              :disabled="!canEditMethodName"
              class="mt-3"
              size="lg"
              placeholder="CUSTOM_METHOD"
              @update:model-value="normalizeCustomMethodInput"
            />
            <p
              v-if="visibleMethodError"
              class="mt-2 flex items-center gap-1.5 text-sm font-medium text-[var(--form-error-text)]"
            >
              <UIcon name="lucide:circle-alert" class="size-4 shrink-0" />
              {{ visibleMethodError }}
            </p>
          </section>

          <section>
            <h3 class="mb-3 font-semibold text-[var(--text-primary)]">Colors</h3>
            <MethodColorPairPicker
              v-model:button-color="form.buttonColor"
              v-model:text-color="form.textColor"
              :method="currentMethodLabel || 'METHOD'"
            />
          </section>

          <div
            v-if="visibleColorError"
            class="rounded-lg border border-[var(--state-danger-outline-border)] bg-[var(--state-danger-soft-bg)] px-4 py-3 text-sm font-medium text-[var(--state-danger-soft-text)]"
          >
            {{ visibleColorError }}
          </div>
        </div>
      </template>

    </CommonDrawer>
  </div>
</template>
