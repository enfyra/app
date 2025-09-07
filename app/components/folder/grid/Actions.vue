<template>
  <div
    v-if="!moveMode"
    class="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700 opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 mt-auto"
  >
    <UButton
      icon="lucide:folder-open"
      size="xs"
      variant="soft"
      color="primary"
      @click.stop="$emit('view-folder')"
      class="flex-1"
    >
      Open
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
    class="flex items-center justify-center pt-2 border-t border-gray-100 dark:border-gray-700 mt-auto"
  >
    <span class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
      <UIcon name="lucide:move" class="w-3 h-3" />
      Move mode active
    </span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  folder: any;
  moveMode: boolean;
  dropdownItems: any[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "view-folder": [];
}>();
</script>