<script setup lang="ts">
import { getDetailPathForTable } from '~/utils/relation-detail-paths';
import { getRelationId } from '~/utils/relation-records';
import type { RelationId } from '~/types/relation';

const props = defineProps<{
  relationMeta: any;
  modelValue: any;
  disabled?: boolean;
}>();
defineOptions({ inheritAttrs: false });

const emit = defineEmits(["update:modelValue"]);
const showModal = ref(false);
const selectedIds = ref<RelationId[]>([]);
const { getId } = useDatabase();

function normalizeRelationIds(values: unknown[]): RelationId[] {
  const seen = new Set<string>();
  return values.reduce<RelationId[]>((ids, value) => {
    const id = getRelationId(value, getId);
    if (id === null || seen.has(String(id))) return ids;
    seen.add(String(id));
    ids.push(id);
    return ids;
  }, []);
}

watch(
  () => props.modelValue,
  () => {
    const values = props.relationMeta.type === "one-to-one" || props.relationMeta.type === "many-to-one"
      ? [props.modelValue]
      : Array.isArray(props.modelValue) ? props.modelValue : [];
    selectedIds.value = normalizeRelationIds(values);
  },
  { immediate: true }
);

function applySelection(ids: RelationId[]) {
  const nextIds = normalizeRelationIds(ids);
  let result;
  switch (props.relationMeta.type) {
    case "one-to-one":
    case "many-to-one":
      result = nextIds[0] ?? null;
      break;
    case "one-to-many":
    case "many-to-many":
      result = nextIds;
      break;
    default:
      result = nextIds;
  }

  emit("update:modelValue", result);
  showModal.value = false;
}

function removeId(id: RelationId) {
  if (
    props.relationMeta.type === "one-to-one" ||
    props.relationMeta.type === "many-to-one"
  ) {
    emit("update:modelValue", null);
    selectedIds.value = [];
  } else {
    const updated = selectedIds.value.filter((selectedId) => selectedId !== id);
    emit("update:modelValue", updated);
    selectedIds.value = updated;
  }
}

function getDetailPath(id: RelationId): string | null {
  const tableName = props.relationMeta?.targetTableName;
  if (!tableName) return null;
  return getDetailPathForTable(tableName, id) || `/data/${tableName}/${id}`;
}
</script>

<template>
  <div class="flex flex-wrap gap-2 items-center">
    <div
      v-for="id in selectedIds"
      :key="id"
      class="relation-inline-chip eapp-primary-soft inline-flex items-stretch overflow-hidden rounded-md"
      :title="String(id)"
    >
      <span class="relation-inline-chip-label max-w-48 truncate px-2 py-0.5 text-xs">
        {{ id }}
      </span>

      <NuxtLink
        v-if="getDetailPath(id)"
        :to="getDetailPath(id)!"
        class="relation-inline-chip-action relation-inline-chip-action-primary px-1.5 flex items-center justify-center text-[10px] transition-colors"
        :title="`Open detail for ${id}`"
      >
        <UIcon name="lucide:arrow-up-right" class="w-3 h-3" />
      </NuxtLink>

      <button
        v-if="!props.disabled"
        type="button"
        class="relation-inline-chip-action relation-inline-chip-action-danger px-1.5 flex items-center justify-center text-[10px] transition-colors"
        title="Remove relation"
        @click.stop="removeId(id)"
      >
        <UIcon name="lucide:x" class="w-3 h-3" />
      </button>
    </div>

    <UButton
      icon="lucide:square-pen"
      size="md"
      variant="outline"
      color="primary"
      @click="showModal = true"
      class="!rounded-[var(--radius-subcontrol)]"
    />
  </div>

  <FormRelationSelector
    v-model:open="showModal"
    :relationMeta="relationMeta"
    :selected-ids="selectedIds"
    :multiple="
      relationMeta.type === 'many-to-many' ||
      relationMeta.type === 'one-to-many'
    "
    @apply="applySelection"
    :disabled="props.disabled"
  />
</template>

<style scoped>
.relation-inline-chip {
  border: 1px solid var(--badge-primary-soft-border);
}

.relation-inline-chip-label {
  background: var(--state-primary-soft-bg-hover);
  color: var(--badge-primary-soft-text);
}

.relation-inline-chip-action {
  border-left: 1px solid color-mix(in srgb, var(--badge-primary-soft-border) 78%, transparent);
  background: color-mix(in srgb, var(--surface-default) 42%, transparent);
  color: var(--badge-primary-soft-text);
}

.relation-inline-chip-action-primary:hover {
  background: color-mix(in srgb, var(--md-primary) 28%, var(--state-primary-soft-bg-hover));
  color: var(--badge-primary-soft-text);
}

.relation-inline-chip-action-danger:hover {
  background: var(--state-danger-soft-bg-hover);
  color: var(--state-danger-soft-text);
}
</style>
