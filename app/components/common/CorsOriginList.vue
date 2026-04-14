<template>
  <div class="space-y-4">
    <p class="text-xs leading-relaxed text-[var(--text-secondary)]">
      Full origins only (scheme, host, port). Example: https://app.example.com
      or http://localhost:3000. An empty list allows every origin.
    </p>

    <CommonLoadingState
      v-if="loading && origins.length === 0"
      title="Loading CORS origins…"
      description="Fetching allowed origins from the server"
      size="sm"
      type="skeleton"
      context="inline"
      class="min-h-[8rem]"
    />

    <ul
      v-else-if="origins.length > 0"
      class="divide-y divide-[var(--border-default)] overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--surface-default)]"
    >
      <li
        v-for="origin in origins"
        :key="origin.id"
        class="flex min-h-11 items-center gap-3 px-3 py-2.5"
      >
        <span
          class="min-w-0 flex-1 truncate font-mono text-sm text-[var(--text-primary)]"
          :class="{ 'opacity-60': !origin.isEnabled }"
          :title="origin.value"
        >{{ origin.value }}</span>

        <USwitch
          :model-value="origin.isEnabled"
          :disabled="rowLoading(origin.id)"
          :aria-label="`Toggle ${origin.value}`"
          @update:model-value="(v: boolean) => toggleEnabled(origin, v)"
        />

        <UButton
          icon="i-lucide-x"
          color="error"
          variant="ghost"
          size="xs"
          class="shrink-0"
          :disabled="rowLoading(origin.id)"
          :aria-label="`Remove ${origin.value}`"
          @click="removeOrigin(origin)"
        />
      </li>
    </ul>

    <div
      v-else
      class="rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)]/40 px-4 py-5 text-center text-sm text-[var(--text-tertiary)]"
    >
      No origins in the list. Any origin will be allowed until you add entries.
    </div>

    <div class="relative">
      <UInput
        v-model="newOrigin"
        placeholder="https://your-app.example.com"
        class="w-full font-mono text-sm"
        :disabled="creating"
        @keyup.enter="addOrigin"
      >
        <template #trailing>
          <UButton
            icon="i-lucide-plus"
            color="primary"
            variant="solid"
            size="md"
            class="rounded-md"
            :loading="creating"
            :disabled="!newOrigin.trim() || creating"
            @click="addOrigin"
          />
        </template>
      </UInput>
    </div>
  </div>
</template>

<script setup lang="ts">
interface CorsOrigin {
  id: string | number;
  value: string;
  isEnabled: boolean;
}

const notify = useNotify();
const { confirm } = useConfirm();
const { getId } = useDatabase();

const newOrigin = ref("");
const creating = ref(false);
const busyIds = ref(new Set<string>());

const {
  data: apiData,
  pending: loading,
  execute: fetchOrigins,
} = useApi(() => "/cors_origin_definition", {
  query: {
    fields: "id,value,isEnabled",
    sort: "value",
    limit: 0,
  },
  errorContext: "Load CORS Origins",
});

const origins = computed<CorsOrigin[]>(() => {
  const rows = apiData.value?.data || [];
  return rows.map((r: any) => ({
    id: getId(r),
    value: r.value,
    isEnabled: r.isEnabled !== false,
  }));
});

const { execute: createApi, error: createError } = useApi(
  () => "/cors_origin_definition",
  { method: "post", errorContext: "Add CORS Origin" }
);

const { execute: updateApi, error: updateError } = useApi(
  () => "/cors_origin_definition",
  { method: "patch", errorContext: "Update CORS Origin" }
);

const { execute: deleteApi, error: deleteError } = useApi(
  () => "/cors_origin_definition",
  { method: "delete", errorContext: "Delete CORS Origin" }
);

function rowLoading(id: string | number) {
  return busyIds.value.has(String(id));
}

function markBusy(id: string | number, busy: boolean) {
  const key = String(id);
  const next = new Set(busyIds.value);
  if (busy) next.add(key);
  else next.delete(key);
  busyIds.value = next;
}

function normalizeOrigin(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  try {
    return new URL(t).origin;
  } catch {
    return t;
  }
}

async function addOrigin() {
  const normalized = normalizeOrigin(newOrigin.value);
  if (!normalized || creating.value) return;

  const exists = origins.value.some(
    (o) => o.value.toLowerCase() === normalized.toLowerCase()
  );
  if (exists) {
    newOrigin.value = "";
    return;
  }

  creating.value = true;
  await createApi({ body: { value: normalized, isEnabled: true } });
  creating.value = false;

  if (createError.value) return;

  newOrigin.value = "";
  notify.success("Success", "CORS origin added.");
  await fetchOrigins();
}

async function toggleEnabled(origin: CorsOrigin, value: boolean) {
  markBusy(origin.id, true);
  await updateApi({ id: origin.id, body: { isEnabled: value } });
  markBusy(origin.id, false);

  if (updateError.value) return;

notify.success("Success")
  await fetchOrigins();
}

async function removeOrigin(origin: CorsOrigin) {
  const ok = await confirm({
    title: "Remove CORS Origin",
    content: `Remove "${origin.value}" from the allowed origins?`,
    confirmText: "Remove",
    cancelText: "Cancel",
  });
  if (!ok) return;

  markBusy(origin.id, true);
  await deleteApi({ id: origin.id });
  markBusy(origin.id, false);

  if (deleteError.value) return;

  notify.success("Success", "CORS origin removed.");
  await fetchOrigins();
}

onMounted(() => {
  fetchOrigins();
});
</script>
