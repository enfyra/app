<template>
  <div class="field-skeleton">
    <!-- Text/Textarea skeleton -->
    <div
      v-if="['text', 'richtext'].includes(type)"
      class="h-16 animate-pulse rounded skeleton-base"
    />

    <!-- Input skeleton -->
    <div
      v-else-if="['int', 'number', 'uuid', 'varchar'].includes(type)"
      class="h-8 animate-pulse rounded skeleton-base"
    />

    <!-- Switch skeleton -->
    <div
      v-else-if="type === 'boolean'"
      class="w-10 h-5 animate-pulse rounded-full skeleton-base"
    />

    <!-- Select skeleton -->
    <div
      v-else-if="['enum', 'array-select'].includes(type)"
      class="h-8 animate-pulse rounded skeleton-base"
    />

    <!-- Date skeleton -->
    <div
      v-else-if="type === 'date'"
      class="h-8 animate-pulse rounded skeleton-base"
    />

    <!-- Code editor skeleton -->
    <div
      v-else-if="['code', 'simple-json'].includes(type)"
      class="h-24 animate-pulse rounded skeleton-base"
    />

    <!-- Array tags skeleton -->
    <div
      v-else-if="type === 'array-tags'"
      class="h-8 animate-pulse rounded skeleton-base"
    />

    <!-- Relation skeleton -->
    <div
      v-else-if="type === 'relation'"
      class="h-8 animate-pulse rounded skeleton-base"
    />

    <!-- Permission skeleton -->
    <div
      v-else-if="type === 'permission'"
      class="h-8 animate-pulse rounded skeleton-base"
    />

    <!-- Default skeleton -->
    <div
      v-else
      class="h-8 animate-pulse rounded skeleton-base"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  type: string;
}

const props = defineProps<Props>();
</script>
