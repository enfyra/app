<script setup lang="ts">
const props = defineProps<{
  page: number;
  total: number;
  limit: number;
  loading: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:page": [page: number];
  apply: [];
}>();

const totalPages = computed(() => Math.ceil(props.total / props.limit) || 1);
const isValidPage = computed(
  () => props.page >= 1 && props.page <= totalPages.value
);

function goToPage(newPage: number) {
  if (newPage >= 1 && newPage <= totalPages.value) {
    emit("update:page", newPage);
  }
}

function apply() {
  if (props.disabled) return;
  emit("apply");
}
</script>

<template>
  <div class="flex justify-between">
    <div class="text-xs text-muted-foreground flex gap-2 items-center">
      <span>Page {{ page }} / {{ totalPages }}</span>
      <span v-if="!isValidPage" class="text-red-500">(Invalid page)</span>
      <UButton
        icon="i-lucide-chevron-left"
        size="xs"
        @click="goToPage(page - 1)"
        :disabled="page <= 1 || totalPages <= 1 || loading"
        :title="`Go to page ${page - 1}`"
      />
      <UButton
        icon="i-lucide-chevron-right"
        size="xs"
        @click="goToPage(page + 1)"
        :disabled="page >= totalPages || totalPages <= 1 || loading"
        :title="`Go to page ${page + 1}`"
      />
    </div>
    <UButton
      icon="lucide:check"
      @click="apply"
      color="primary"
      size="sm"
      :disabled="disabled"
    >
      Apply
    </UButton>
  </div>
</template>
