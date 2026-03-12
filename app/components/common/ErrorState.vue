<script setup lang="ts">
const props = defineProps<{
  title?: string;
  description?: string;
  icon?: string;
  retry?: () => void;
  retryLabel?: string;
  size?: "sm" | "md" | "lg";
}>();

const defaultTitle = "Something went wrong";
const defaultDescription = "An error occurred while loading the data.";
const defaultIcon = "lucide:alert-circle";
const defaultSize = "md";
const defaultRetryLabel = "Try Again";

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
  <div
    role="alert"
    aria-live="assertive"
    class="flex flex-col items-center justify-center py-8 gap-3"
  >
    <UIcon
      :name="props.icon || defaultIcon"
      :class="`${iconSize} text-red-400 dark:text-red-500`"
    />
    <div class="text-center">
      <p :class="`${textSize} font-medium text-gray-800 dark:text-white/90`">
        {{ props.title || defaultTitle }}
      </p>
      <p
        v-if="props.description || defaultDescription"
        :class="`${textSize} text-sm text-gray-500 dark:text-gray-400 mt-1`"
      >
        {{ props.description || defaultDescription }}
      </p>
    </div>
    <UButton
      v-if="props.retry"
      icon="lucide:refresh-cw"
      @click="props.retry"
      size="sm"
      variant="soft"
      color="error"
    >
      {{ props.retryLabel || defaultRetryLabel }}
    </UButton>
  </div>
</template>
