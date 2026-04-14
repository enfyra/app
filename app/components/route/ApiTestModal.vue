<template>
  <CommonModal v-model="isOpen" class="max-w-[700px]">
    <template #title>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-flask-conical" class="w-5 h-5 text-primary-500" />
        <h3 class="text-lg font-semibold">Test API</h3>
      </div>
    </template>
    <template #body>
      <div class="space-y-5">
        <div class="space-y-2">
          <div class="flex gap-1.5">
            <UButton
              v-for="m in httpMethods"
              :key="m"
              :color="method === m ? methodColor(m) : 'neutral'"
              :variant="method === m ? 'solid' : 'outline'"
              size="xs"
              :disabled="!isMethodAvailable(m)"
              @click="method = m"
            >{{ m }}</UButton>
            <div class="flex items-center gap-1.5 ml-auto">
              <UBadge v-if="isPublished" color="success" variant="soft" size="xs">Public</UBadge>
              <UBadge v-else color="warning" variant="soft" size="xs">Auth Required</UBadge>
              <UBadge v-if="hasCustomHandler" color="info" variant="soft" size="xs">Custom</UBadge>
              <UBadge v-else-if="mainTableName" color="neutral" variant="soft" size="xs">CRUD</UBadge>
            </div>
          </div>
          <div class="relative w-full group">
            <UInput :model-value="fullUrl" disabled class="w-full font-mono text-[11px]" :title="fullUrl" />
            <UButton v-if="fullUrl.length > 60" size="xs" variant="ghost" class="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" @click="showFullUrl = !showFullUrl">{{ showFullUrl ? 'Hide' : 'Full' }}</UButton>
          </div>
          <pre v-if="showFullUrl" class="text-[10px] font-mono text-[var(--text-tertiary)] break-all whitespace-pre-wrap px-1">{{ fullUrl }}</pre>
        </div>

        <div v-if="methodWarning" class="flex items-center gap-2 p-2.5 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-xs text-yellow-700 dark:text-yellow-300">
          <UIcon name="i-lucide-alert-triangle" class="w-4 h-4 flex-shrink-0" />
          {{ methodWarning }}
        </div>

        <UFormField v-if="['PATCH', 'DELETE'].includes(method)" label="Record ID" required class="w-full">
          <UInput v-model="recordId" placeholder="1" class="w-full font-mono text-xs" />
        </UFormField>

        <div v-if="['POST', 'PATCH'].includes(method)">
          <h4 class="text-xs font-semibold text-[var(--text-tertiary)] mb-2">Request Body</h4>
          <FormCodeEditorLazy v-model="body" language="json" height="160px" class="w-full" />
        </div>

        <div v-if="method !== 'DELETE'">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-xs font-semibold text-[var(--text-tertiary)]">Query Parameters</h4>
            <UButton size="xs" variant="ghost" icon="i-lucide-plus" @click="addQueryParam">Add</UButton>
          </div>
          <div class="space-y-1.5">
            <div v-for="(param, idx) in queryParams" :key="idx" class="flex flex-wrap sm:flex-nowrap gap-2 items-center">
              <USwitch v-model="param.enabled" size="xs" class="flex-shrink-0" />
              <UInput v-model="param.key" placeholder="key" class="w-full sm:w-[120px] font-mono text-xs" :disabled="!param.enabled" />
              <UInput v-model="param.value" placeholder="value" class="w-full sm:flex-1 font-mono text-xs min-w-0" :disabled="!param.enabled" />
              <UButton size="xs" variant="ghost" color="error" icon="i-lucide-x" class="flex-shrink-0" @click="queryParams.splice(idx, 1)" />
            </div>
          </div>
        </div>

        <div v-if="method !== 'DELETE' && mainTableName && schemas && Object.keys(schemas).length > 0" class="space-y-4">
          <div v-if="method === 'GET'">
            <h4 class="text-xs font-semibold text-[var(--text-tertiary)] mb-2">Filter</h4>
            <FilterBuilder v-model="filterObject" :schemas="schemas" :table-name="mainTableName" />
          </div>
          <div>
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-xs font-semibold text-[var(--text-tertiary)]">Response Fields</h4>
              <div class="flex gap-1">
                <UButton size="xs" variant="ghost" color="neutral" @click="selectedFields = []">Clear</UButton>
              </div>
            </div>

            <RouteFieldPickerNode
              :schemas="schemas!"
              :table-name="mainTableName!"
              prefix=""
              :selected-fields="selectedFields"
              @toggle="toggleField($event)"
              @toggle-all="handleToggleAll"
            />
          </div>
        </div>

        <div v-if="response !== null" class="border-t border-[var(--border-default)] pt-4 space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <h4 class="text-xs font-semibold text-[var(--text-tertiary)]">Response</h4>
            <UBadge :color="statusColor" variant="soft" size="xs">{{ response.status }}</UBadge>
            <span class="text-[11px] text-[var(--text-quaternary)] font-mono">{{ response.duration }}ms</span>
            <span class="text-[11px] text-[var(--text-quaternary)]">{{ responseSize }}</span>
            <div class="flex-1" />
            <UButton size="xs" variant="ghost" icon="i-lucide-copy" @click="copyResponse">Copy</UButton>
          </div>
          <pre class="p-3 rounded-lg bg-[var(--surface-muted)] border border-[var(--border-default)] text-xs font-mono overflow-auto max-h-[300px] whitespace-pre-wrap" :class="response.status >= 400 ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-secondary)]'">{{ response.body }}</pre>
        </div>

        <div v-if="responseError" class="p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
          {{ responseError }}
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex gap-2 w-full justify-end">
        <UButton v-if="response" variant="ghost" color="neutral" icon="i-lucide-x" @click="response = null; responseError = ''">Clear</UButton>
        <UButton color="primary" icon="i-lucide-play" :loading="pending" :disabled="!canSend" @click="sendRequest">Send</UButton>
      </div>
    </template>
  </CommonModal>
</template>

<script setup lang="ts">
import { HTTP_METHODS, getHttpMethodColor } from '~/utils/http.constants';

const props = defineProps<{
  modelValue: boolean;
  routePath: string;
  availableMethods: string[];
  publishedMethods?: string[];
  handlers?: any[];
  mainTableName?: string;
  schemas?: Record<string, any>;
  columns?: string[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const notify = useNotify();

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const httpMethods = HTTP_METHODS;
const method = ref<string>('GET');
const filterObject = ref<any>(null);
const selectedFields = ref<string[]>([]);
const queryParams = ref<{ key: string; value: string; enabled: boolean }[]>([
  { key: 'limit', value: '50', enabled: true },
  { key: 'sort', value: '-createdAt', enabled: false },
]);
const body = ref('{\n  \n}');
const recordId = ref('');
const pending = ref(false);
const showFullUrl = ref(false);
const response = ref<{ status: number; body: string; duration: number } | null>(null);
const responseError = ref('');

const { createEmptyFilter, buildQuery } = useFilterQuery();

watch(() => props.modelValue, (open) => {
  if (open) {
    pending.value = false;
    response.value = null;
    responseError.value = '';
    recordId.value = '';
    filterObject.value = createEmptyFilter();
    const hasTable = !!props.mainTableName;
    queryParams.value = [
      { key: 'limit', value: '10', enabled: hasTable },
      { key: 'sort', value: '-createdAt', enabled: false },
    ];
    const available = httpMethods.filter(m => isMethodAvailable(m));
    method.value = available[0] || 'GET';
  }
});

function isMethodAvailable(m: string): boolean {
  return props.availableMethods.some(am => am === m || am === 'REST');
}

const isPublished = computed(() =>
  props.publishedMethods?.some(pm => pm === method.value || pm === 'REST') ?? false
);

const hasCustomHandler = computed(() =>
  props.handlers?.some((h: any) => h.method?.method === method.value || h.method === method.value) ?? false
);

const methodWarning = computed(() => {
  if (!isMethodAvailable(method.value)) return `Method ${method.value} is not available on this route.`;
  if (!props.mainTableName && !hasCustomHandler.value) return `No handler configured for ${method.value}. Request will likely fail.`;
  return '';
});

const canSend = computed(() => {
  if (!isMethodAvailable(method.value)) return false;
  if (!props.mainTableName && !hasCustomHandler.value) return false;
  if (['PATCH', 'DELETE'].includes(method.value) && !recordId.value) return false;
  return true;
});

function methodColor(m: string): any {
  return getHttpMethodColor(m);
}

function addQueryParam() {
  queryParams.value.push({ key: '', value: '', enabled: true });
}

function toggleField(field: string) {
  const idx = selectedFields.value.indexOf(field);
  if (idx >= 0) selectedFields.value.splice(idx, 1);
  else selectedFields.value.push(field);
}

function handleToggleAll(prefix: string) {
  const p = prefix + '.';
  const hasAny = selectedFields.value.some(f => f.startsWith(p));
  if (hasAny) {
    selectedFields.value = selectedFields.value.filter(f => !f.startsWith(p));
  } else {
    selectedFields.value = [...selectedFields.value, `${prefix}.*`];
  }
}

const fullUrl = computed(() => {
  let url = `/api${props.routePath}`;
  if (recordId.value && ['PATCH', 'DELETE'].includes(method.value)) url += `/${recordId.value}`;
  if (method.value !== 'DELETE') {
    const params = new URLSearchParams();
    for (const p of queryParams.value) {
      if (p.enabled && p.key && p.value) params.set(p.key, p.value);
    }
    if (method.value === 'GET' && props.mainTableName && filterObject.value) {
      const filterQ = buildQuery(filterObject.value);
      if (filterQ && Object.keys(filterQ).length > 0) params.set('filter', JSON.stringify(filterQ));
    }
    if (method.value === 'GET' && selectedFields.value.length > 0) params.set('fields', selectedFields.value.join(','));
    const qs = decodeURIComponent(params.toString());
    if (qs) url += `?${qs}`;
  }
  return url;
});

const statusColor = computed(() => {
  if (!response.value) return 'neutral';
  const s = response.value.status;
  if (s >= 200 && s < 300) return 'success';
  if (s >= 400 && s < 500) return 'warning';
  if (s >= 500) return 'error';
  return 'info';
});

const responseSize = computed(() => {
  if (!response.value?.body) return '';
  const bytes = new Blob([response.value.body]).size;
  return bytes > 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;
});

async function copyResponse() {
  if (!response.value?.body) return;
  await navigator.clipboard.writeText(response.value.body);
  notify.success("Copied");
}

async function sendRequest() {
  pending.value = true;
  response.value = null;
  responseError.value = '';
  const start = Date.now();

  try {
    const url = fullUrl.value;
    const opts: RequestInit = { method: method.value, headers: { 'Content-Type': 'application/json' } };

    if (['POST', 'PATCH'].includes(method.value) && body.value?.trim()) {
      try {
        JSON.parse(body.value);
        opts.body = body.value;
      } catch {
        responseError.value = 'Invalid JSON in request body';
        pending.value = false;
        return;
      }
    }

    const res = await fetch(url, opts);
    const contentType = res.headers.get('content-type') || '';
    let text: string;
    if (contentType.includes('json')) {
      const json = await res.json();
      text = JSON.stringify(json, null, 2);
    } else {
      text = await res.text();
    }

    response.value = { status: res.status, body: text, duration: Date.now() - start };
  } catch (err: any) {
    responseError.value = err.message || 'Request failed';
  } finally {
    pending.value = false;
  }
}
</script>
