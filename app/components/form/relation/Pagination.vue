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

const { isMobile, isTablet } = useScreen();
</script>

<template>
  <div class="flex justify-between items-center">
    <div :class="(isMobile || isTablet) ? 'text-xs text-muted-foreground flex gap-1.5 items-center' : 'text-xs text-muted-foreground flex gap-2 items-center'">
      <span v-if="!isMobile && !isTablet">Page {{ page }} / {{ totalPages }}</span>
      <span v-if="!isValidPage && !isMobile && !isTablet" class="text-red-500">(Invalid page)</span>
      <UButton
        icon="i-lucide-chevron-left"
        :size="(isMobile || isTablet) ? 'sm' : 'xs'"
        @click="goToPage(page - 1)"
        :disabled="page <= 1 || totalPages <= 1 || loading"
        :title="`Go to page ${page - 1}`"
        :class="(isMobile || isTablet) ? 'rounded-full !aspect-square' : ''"
        color="secondary"
      />
      <span v-if="isMobile || isTablet" class="text-xs font-medium">{{ page }}/{{ totalPages }}</span>
      <UButton
        icon="i-lucide-chevron-right"
        :size="(isMobile || isTablet) ? 'sm' : 'xs'"
        @click="goToPage(page + 1)"
        :disabled="page >= totalPages || totalPages <= 1 || loading"
        :title="`Go to page ${page + 1}`"
        :class="(isMobile || isTablet) ? 'rounded-full !aspect-square' : ''"
        color="secondary"
      />
      
    </div>
    <UButton
      icon="lucide:check"
      @click="apply"
      color="primary"
      :size="(isMobile || isTablet) ? 'sm' : 'sm'"
      :disabled="disabled"
      :class="(isMobile || isTablet) ? 'rounded-full !aspect-square' : ''"
    >
      <span v-if="!isMobile && !isTablet">Apply</span>
    </UButton>
  </div>
</template>
