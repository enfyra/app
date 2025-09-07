<template>
  <div
    v-if="!moveMode"
    class="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700 opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200"
  >
    <UButton
      icon="lucide:eye"
      size="xs"
      variant="soft"
      color="primary"
      @click.stop="$emit('view-file')"
      class="flex-1"
    >
      View
    </UButton>
    <UDropdownMenu :items="dropdownItems">
      <UButton
        icon="lucide:more-vertical"
        size="xs"
        variant="ghost"
        color="neutral"
        @click.stop
      />
    </UDropdownMenu>
  </div>
  
  <div
    v-else
    class="flex items-center justify-center pt-2 border-t border-gray-100 dark:border-gray-700"
  >
    <span class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
      <UIcon name="lucide:move" class="w-3 h-3" />
      Move mode active
    </span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  file: any;
  moveMode: boolean;
  dropdownItems: any[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "view-file": [];
}>();
</script>