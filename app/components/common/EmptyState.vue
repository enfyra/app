<script setup lang="ts">
const props = defineProps<{
  title?: string;
  description?: string;
  icon?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: string;
  };
  size?: "sm" | "md" | "lg";
  variant?: "outline" | "naked" | "soft" | "subtle" | "solid";
}>();

const mappedActions = computed(() => {
  if (!props.action) return undefined;
  return [
    {
      label: props.action.label,
      icon: props.action.icon,
      variant: "soft" as const,
      color: "primary" as const,
      size: "sm" as const,
      onClick: props.action.onClick,
    },
  ];
});
</script>

<template>
  <UEmpty
    :icon="props.icon || 'lucide:database'"
    :title="props.title || 'No data available'"
    :description="props.description"
    :actions="mappedActions"
    :size="props.size || 'md'"
    :variant="props.variant || 'outline'"
  />
</template>
