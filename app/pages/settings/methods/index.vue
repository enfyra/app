<script setup lang="ts">
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
  gradient: 'cyan',
});

const methodsCache = useState<any[]>('methods-cache', () => []);
const methodsLoaded = useState<boolean>('methods-loaded', () => false);
const drawerOpen = ref(false);
const mode = ref<'create' | 'edit'>('create');
const saving = ref(false);
const customMethod = ref(false);
const closingDrawer = ref(false);
const initialForm = ref({
  id: null as string | number | null,
  method: '',
  buttonColor: '',
  textColor: '',
  isSystem: false,
  customMethod: false,
});
const form = reactive({
  id: null as string | number | null,
  method: '',
  buttonColor: '',
  textColor: '',
  isSystem: false,
});

const {
  data: methodsData,
  pending: loading,
  execute: fetchMethods,
} = useApi<{ data: MethodRecord[] }>('/method_definition', {
  query: {
    fields: '*',
    sort: 'method',
    limit: 0,
  },
  errorContext: 'Fetch Methods',
});

const { execute: createMethod } = useApi('/method_definition', {
  method: 'post',
  errorContext: 'Create Method',
  disableErrorPage: true,
});

const { execute: updateMethod } = useApi('/method_definition', {
  method: 'patch',
  errorContext: 'Update Method',
  disableErrorPage: true,
});

const methods = computed(() => methodsData.value?.data || []);
const methodNames = computed(() => new Set(methods.value.map((method) => getMethodLabel(method))));
const currentMethodLabel = computed(() => normalizeMethodName(form.method));
const canEditMethodName = computed(() => mode.value === 'create' || !form.isSystem);

const formError = computed(() => {
  const method = currentMethodLabel.value;
  if (!method) return 'Select a method.';
  if (!CUSTOM_METHOD_RE.test(method)) {
    return 'Use uppercase letters, numbers, or underscore. The first character must be a letter.';
  }
  const duplicate = methodNames.value.has(method) && (mode.value === 'create' || method !== form.method);
  if (duplicate) return `${method} already exists.`;
  if (!isHexColor(form.buttonColor) || !isHexColor(form.textColor)) {
    return 'Button and text colors must be full hex values.';
  }
  return null;
});

const canSave = computed(() => !saving.value && !formError.value);
const hasUnsavedChanges = computed(() => (
  form.id !== initialForm.value.id ||
  form.method !== initialForm.value.method ||
  form.buttonColor !== initialForm.value.buttonColor ||
  form.textColor !== initialForm.value.textColor ||
  form.isSystem !== initialForm.value.isSystem ||
  customMethod.value !== initialForm.value.customMethod
));

const visibleMethodOptions = computed(() => {
  if (mode.value === 'edit') return METHOD_OPTIONS;
  return METHOD_OPTIONS.filter((method) => !methodNames.value.has(method));
});

watch(methodsData, (data) => {
  if (data?.data) {
    methodsCache.value = data.data;
    methodsLoaded.value = true;
  }
});

function resetForm() {
  form.id = null;
  form.method = '';
  form.buttonColor = '';
  form.textColor = '';
  form.isSystem = false;
  customMethod.value = false;
}

function snapshotForm() {
  initialForm.value = {
    id: form.id,
    method: form.method,
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
  form.method = method;
  customMethod.value = false;
  applySuggestedColors(method);
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
  form.method = getMethodLabel(method);
  form.buttonColor = colors.buttonColor;
  form.textColor = colors.textColor;
  form.isSystem = Boolean(method.isSystem);
  customMethod.value = !METHOD_OPTIONS.includes(form.method);
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
      body.method = currentMethodLabel.value;
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

function normalizeCustomMethodInput(value: string) {
  form.method = normalizeMethodName(value);
}

useHeaderActionRegistry([
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
          route: '/method_definition',
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
      <div v-if="loading && !methods.length" class="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
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
        <article
          v-for="method in methods"
          :key="getId(method) || getMethodLabel(method)"
          class="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]"
        >
          <div class="flex items-start justify-between gap-3">
            <MethodBadge :method="method" size="sm" />
            <UBadge :color="method.isSystem ? 'neutral' : 'primary'" variant="soft">
              {{ method.isSystem ? 'System' : 'Custom' }}
            </UBadge>
          </div>

          <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Button
              </dt>
              <dd class="mt-1 font-mono text-[var(--text-primary)]">
                {{ getMethodColors(method).buttonColor }}
              </dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Text
              </dt>
              <dd class="mt-1 font-mono text-[var(--text-primary)]">
                {{ getMethodColors(method).textColor }}
              </dd>
            </div>
          </dl>

          <UButton
            type="button"
            class="mt-4"
            icon="lucide:paintbrush"
            variant="outline"
            color="neutral"
            block
            @click="openEdit(method)"
          >
            Edit
          </UButton>
        </article>
      </div>
    </div>

    <CommonDrawer
      :model-value="drawerOpen"
      direction="right"
      @update:model-value="handleDrawerOpenChange"
    >
      <template #header>
        <div class="flex items-center gap-3">
          <div class="flex size-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-950/40 dark:text-primary-300">
            <UIcon name="lucide:badge" class="size-6" />
          </div>
          <div>
            <h2 class="text-xl font-semibold text-[var(--text-primary)]">
              {{ mode === 'create' ? 'Create method' : 'Edit method' }}
            </h2>
            <p class="text-sm text-[var(--text-secondary)]">
              {{ mode === 'create' ? 'Pick a method and assign its badge colors.' : 'Adjust the method colors used across eApp.' }}
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
                :method="{ method: currentMethodLabel, buttonColor: form.buttonColor, textColor: form.textColor }"
              />
            </div>

            <div class="flex flex-wrap gap-2">
              <button
                v-for="method in visibleMethodOptions"
                :key="method"
                type="button"
                :disabled="!canEditMethodName"
                class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                :class="isMethodSelected(method) ? 'border-primary-400 bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-200' : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]'"
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
                :class="customMethod ? 'border-primary-400 bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-200' : 'border-dashed border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]'"
                @click="customMethod = true"
              >
                <UIcon name="lucide:plus" class="size-4" />
                Custom
              </button>
            </div>

            <UInput
              v-if="customMethod"
              v-model="form.method"
              :disabled="!canEditMethodName"
              class="mt-3"
              size="lg"
              placeholder="CUSTOM_METHOD"
              @update:model-value="normalizeCustomMethodInput"
            />
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
            v-if="formError"
            class="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm font-medium text-error-700 dark:border-error-900/60 dark:bg-error-950/30 dark:text-error-300"
          >
            {{ formError }}
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            type="button"
            variant="outline"
            color="neutral"
            @click="() => closeDrawer()"
          >
            Cancel
          </UButton>
          <UButton
            type="button"
            icon="lucide:save"
            :loading="saving"
            :disabled="!canSave"
            @click="saveMethod"
          >
            {{ mode === 'create' ? 'Create method' : 'Save changes' }}
          </UButton>
        </div>
      </template>
    </CommonDrawer>
  </div>
</template>
