<script setup lang="ts">
interface Props {
  title: string;
  description?: string | undefined;
  icon?: string | undefined;
}

const props = defineProps<Props>();

const route = useRoute();
const { findMenuIconForPath } = useMenuRegistry();

const resolvedIcon = computed(() => props.icon ?? findMenuIconForPath(route.path));
</script>

<template>
  <div class="flex min-w-0 items-start gap-2">
    <UIcon v-if="resolvedIcon" :name="resolvedIcon" class="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
    <div class="min-w-0">
      <h2 class="truncate text-sm font-medium text-highlighted" :title="title">{{ title }}</h2>
      <p v-if="description" class="mt-0.5 truncate text-xs text-muted" :title="description">{{ description }}</p>
    </div>
  </div>
</template>
