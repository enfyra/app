<template>
  <CommonModal v-model="isOpen" class="max-w-[760px]">
    <template #title>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-flask-conical" class="w-5 h-5 text-primary-500" />
        <h3 class="text-lg font-semibold">Test connection handler</h3>
      </div>
    </template>
    <template #body>
      <div class="space-y-4">
        <div class="text-xs text-[var(--text-tertiary)]">
          Runs <span class="font-mono">connectionHandlerScript</span> via <span class="font-mono">/admin/test/run</span> (<span class="font-mono">kind: "websocket_connection"</span>).
        </div>

        <div v-if="!canRun" class="text-xs text-amber-700 dark:text-amber-300 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 p-2">
          Please fill <span class="font-mono">connectionHandlerScript</span> to enable testing.
        </div>

        <div>
          <div class="text-xs font-medium text-[var(--text-tertiary)] mb-1">Client info (JSON)</div>
          <FormCodeEditorLazy v-model="payloadJson" language="json" height="180px" class="w-full text-xs" />
          <div v-if="!payloadJson?.trim()" class="mt-1 text-[11px] text-[var(--text-tertiary)] font-mono">
            {{ placeholder }}
          </div>
        </div>

        <div v-if="result" class="space-y-2 border-t border-[var(--border-default)] pt-4">
          <div class="flex items-center gap-2">
            <UIcon
              :name="result.success ? 'lucide:check-circle' : 'lucide:x-circle'"
              class="w-4 h-4"
              :class="result.success ? 'text-emerald-600' : 'text-rose-600'"
            />
            <div class="text-xs font-medium" :class="result.success ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'">
              {{ result.success ? 'Test passed' : 'Test failed' }}
            </div>
          </div>

          <div v-if="result.error" class="text-xs text-rose-700 dark:text-rose-300 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/20 p-2">
            {{ result.error?.message || result.error }}
          </div>

          <div v-if="result.logs?.length" class="space-y-1">
            <div class="text-xs font-medium text-[var(--text-tertiary)]">Logs</div>
            <pre class="text-[11px] font-mono rounded-lg border border-[var(--border-default)] bg-[var(--surface-muted)] p-2 overflow-auto max-h-[160px] whitespace-pre-wrap">{{ JSON.stringify(result.logs, null, 2) }}</pre>
          </div>

          <div v-if="result.emitted?.length" class="space-y-1">
            <div class="text-xs font-medium text-[var(--text-tertiary)]">Emitted</div>
            <pre class="text-[11px] font-mono rounded-lg border border-[var(--border-default)] bg-[var(--surface-muted)] p-2 overflow-auto max-h-[200px] whitespace-pre-wrap">{{ JSON.stringify(result.emitted, null, 2) }}</pre>
          </div>

          <div v-if="result.result !== undefined" class="space-y-1">
            <div class="text-xs font-medium text-[var(--text-tertiary)]">Result</div>
            <pre class="text-[11px] font-mono rounded-lg border border-[var(--border-default)] bg-[var(--surface-muted)] p-2 overflow-auto max-h-[200px] whitespace-pre-wrap">{{ JSON.stringify(result.result, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex gap-2 w-full justify-end">
        <UButton variant="outline" color="neutral" @click="isOpen = false">Close</UButton>
        <UButton
          color="primary"
          icon="i-lucide-play"
          :loading="testing || pending"
          :disabled="!canRun"
          @click="run"
        >
          Test
        </UButton>
      </div>
    </template>
  </CommonModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
  gatewayPath?: string;
  script: string;
  timeoutMs?: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const toast = useToast();

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const placeholder = '{\n  "ip": "1.2.3.4",\n  "headers": {\n    "user-agent": "Mozilla/5.0"\n  }\n}';
const payloadJson = ref('');
const testing = ref(false);
const result = ref<any>(null);

const canRun = computed(() => !!String(props.script || '').trim());

const {
  execute,
  pending,
  error,
  data,
} = useApi(() => `/admin/test/run`, {
  method: 'post',
  errorContext: 'Test WebSocket Connection Handler',
  immediate: false,
  lazy: true,
});

watch(() => props.modelValue, (open) => {
  if (open) {
    testing.value = false;
    result.value = null;
  }
});

async function run() {
  if (!canRun.value) return;

  let payload: any = {};
  if (payloadJson.value?.trim()) {
    try {
      payload = JSON.parse(payloadJson.value);
    } catch {
      toast.add({ title: 'Invalid JSON', color: 'error', description: 'Test payload JSON is invalid.' });
      return;
    }
  }

  const timeoutMs = Number(props.timeoutMs ?? 5000);
  const gatewayPath = String(props.gatewayPath || '').trim();

  testing.value = true;
  result.value = null;
  try {
    await execute({
      body: {
        kind: 'websocket_connection',
        ...(gatewayPath ? { gatewayPath } : {}),
        timeoutMs,
        payload,
        script: String(props.script || '').trim(),
      },
    });
    if (error.value) {
      result.value = { success: false, error: error.value.message };
      return;
    }
    result.value = data.value;
  } finally {
    testing.value = false;
  }
}
</script>
