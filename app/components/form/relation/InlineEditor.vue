<script setup lang="ts">
import { resolveRelationDetailPath } from '~/utils/relation-detail-paths';

const props = defineProps<{
  relationMeta: any;
  modelValue: any;
  disabled?: boolean;
}>();
defineOptions({ inheritAttrs: false });

const emit = defineEmits(["update:modelValue"]);
const showModal = ref(false);
const selectedIds = ref<any[]>([]);
const { getId } = useDatabase();

watch(
  () => props.modelValue,
  () => {
    if (
      props.relationMeta.type === "one-to-one" ||
      props.relationMeta.type === "many-to-one"
    ) {
      selectedIds.value =
        props.modelValue && getId(props.modelValue) ? [props.modelValue] : [];
    } else {
      selectedIds.value = Array.isArray(props.modelValue)
        ? props.modelValue.filter((item) => item && getId(item))
        : [];
    }
  },
  { immediate: true }
);

function applySelection(ids: any[]) {
  let result;
  switch (props.relationMeta.type) {
    case "one-to-one":
    case "many-to-one":
      result = ids.length > 0 ? ids[0] : null;
      break;
    case "one-to-many":
    case "many-to-many":
      result = ids;
      break;
    default:
      result = ids;
  }

  emit("update:modelValue", result);
  showModal.value = false;
}

function removeId(id: any) {
  if (id === undefined || id === null) {
    console.warn("Cannot remove item with undefined/null id:", id);
    return;
  }

  if (
    props.relationMeta.type === "one-to-one" ||
    props.relationMeta.type === "many-to-one"
  ) {
    emit("update:modelValue", null);
    selectedIds.value = [];
  } else {
    const updated = selectedIds.value.filter((i) => getId(i) !== id);
    emit("update:modelValue", updated);
    selectedIds.value = updated;
  }
}

function shortenId(id: string | number): string {
  if (id === undefined || id === null) {
    return "Invalid ID";
  }
  const str = String(id);
  return str.length > 12 ? `${str.slice(0, 4)}…${str.slice(-3)}` : str;
}

async function navigateToDetail(item: any) {
  const tableName = props.relationMeta?.targetTableName;

  if (!tableName) return;

  const url = resolveRelationDetailPath(tableName, item);

  if (url) {
    await navigateTo(url);
    return;
  }

  const itemId = getId(item);
  if (!itemId) return;
  await navigateTo(`/data/${tableName}/${itemId}`);
}
</script>

<template>
  <div class="flex flex-wrap gap-2 items-center">
    <div
      v-for="item in selectedIds"
      :key="getId(item)"
      class="eapp-accent-soft inline-flex items-stretch overflow-hidden rounded-md"
      :title="getId(item) ? String(getId(item)) : 'Invalid ID'"
    >
      <span class="bg-[var(--state-primary-soft-bg-hover)] px-2 py-0.5 font-mono text-xs">
        {{ getId(item) ? shortenId(getId(item)) : "Invalid ID" }}
      </span>

      <button
        type="button"
        class="px-1.5 flex items-center justify-center text-[10px] text-[var(--text-secondary)] hover:bg-primary-500/20 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
        :title="`Open detail for ${getId(item)}`"
        @click.stop="navigateToDetail(item)"
      >
        <UIcon name="lucide:arrow-up-right" class="w-3 h-3" />
      </button>

      <button
        v-if="!props.disabled"
        type="button"
        class="px-1.5 flex items-center justify-center text-[10px] text-[var(--text-secondary)] hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        title="Remove relation"
        @click.stop="removeId(getId(item))"
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
      class="rounded-full"
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
