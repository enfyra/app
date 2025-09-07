<template>
  <div class="field-skeleton">
    <!-- Text/Textarea skeleton -->
    <div
      v-if="['text', 'richtext'].includes(type)"
      class="h-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"
    />

    <!-- Input skeleton -->
    <div
      v-else-if="['int', 'number', 'uuid', 'varchar'].includes(type)"
      class="h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"
    />

    <!-- Switch skeleton -->
    <div
      v-else-if="type === 'boolean'"
      class="w-10 h-5 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-full"
    />

    <!-- Select skeleton -->
    <div
      v-else-if="['enum', 'array-select'].includes(type)"
      class="h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"
    />

    <!-- Date skeleton -->
    <div
      v-else-if="type === 'date'"
      class="h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"
    />

    <!-- Code editor skeleton -->
    <div
      v-else-if="['code', 'simple-json'].includes(type)"
      class="h-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"
    />

    <!-- Array tags skeleton -->
    <div
      v-else-if="type === 'array-tags'"
      class="h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"
    />

    <!-- Relation skeleton -->
    <div
      v-else-if="type === 'relation'"
      class="h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"
    />

    <!-- Permission skeleton -->
    <div
      v-else-if="type === 'permission'"
      class="h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"
    />

    <!-- Default skeleton -->
    <div
      v-else
      class="h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  type: string;
}

const props = defineProps<Props>();
</script>
