<script setup lang="ts">
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
  // Ngắn hơn nữa: 4 ký tự đầu + … + 3 ký tự cuối
  return str.length > 12 ? `${str.slice(0, 4)}…${str.slice(-3)}` : str;
}
</script>

<template>
  <div class="flex flex-wrap gap-2 items-center">
    <UBadge
      v-for="item in selectedIds"
      :key="getId(item)"
      size="lg"
      :color="getId(item) ? 'primary' : 'error'"
      variant="soft"
      class="flex items-center gap-1"
      :title="getId(item) ? String(getId(item)) : 'Invalid ID'"
    >
      {{ getId(item) ? shortenId(getId(item)) : "Invalid ID" }}
      <button
        @click.stop="removeId(getId(item))"
        class="ml-1 text-xs lg:hover:text-red-500 cursor-pointer"
        title="Delete"
        v-if="!props.disabled"
      >
        ✕
      </button>
    </UBadge>

    <UButton
      icon="lucide:square-pen"
      size="md"
      variant="outline"
      color="secondary"
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
