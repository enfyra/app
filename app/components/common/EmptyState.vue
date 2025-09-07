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
}>();

const defaultTitle = "No data available";
const defaultIcon = "lucide:database";
const defaultSize = "md";

// Hardcode các class để Tailwind có thể generate buildtime
const iconSize = computed(() => {
  switch (props.size || defaultSize) {
    case "sm":
      return "!w-[32px] !h-[32px]";
    case "lg":
      return "!w-[64px] !h-[64px]";
    default:
      return "!w-[48px] !h-[48px]";
  }
});

const textSize = computed(() => {
  switch (props.size || defaultSize) {
    case "sm":
      return "!text-[14px]";
    case "lg":
      return "!text-[18px]";
    default:
      return "!text-[16px]";
  }
});
</script>

<template>
  <div class="flex flex-col items-center justify-center py-8 gap-3">
    <UIcon
      :name="props.icon || defaultIcon"
      :class="`${iconSize} text-muted-foreground`"
    />
    <div class="text-center">
      <p :class="`${textSize} font-medium text-foreground`">
        {{ props.title || defaultTitle }}
      </p>
      <p
        v-if="props.description"
        :class="`${textSize} text-sm text-muted-foreground mt-1`"
      >
        {{ props.description }}
      </p>
    </div>
    <UButton
      v-if="props.action"
      :icon="props.action.icon"
      @click="props.action.onClick"
      size="sm"
      variant="soft"
      color="primary"
    >
      {{ props.action.label }}
    </UButton>
  </div>
</template>
