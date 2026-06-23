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

const sizeClass = computed(() => {
  const map = {
    sm: {
      root: "min-h-40 px-5 py-8",
      icon: "h-10 w-10",
      iconGlyph: "h-5 w-5",
      title: "text-sm",
      description: "text-xs",
    },
    md: {
      root: "min-h-48 px-6 py-10",
      icon: "h-12 w-12",
      iconGlyph: "h-6 w-6",
      title: "text-base",
      description: "text-sm",
    },
    lg: {
      root: "min-h-56 px-8 py-12",
      icon: "h-14 w-14",
      iconGlyph: "h-7 w-7",
      title: "text-lg",
      description: "text-sm",
    },
  };

  return map[props.size || "md"];
});

const variantClass = computed(() => {
  switch (props.variant || "outline") {
    case "naked":
      return "bg-transparent";
    case "soft":
      return "surface-muted";
    case "solid":
      return "bg-[var(--action-primary-bg)] border border-[var(--action-primary-bg)] rounded-[var(--radius-card)]";
    case "subtle":
      return "bg-[var(--surface-nested)] border border-[var(--border-subtle)] rounded-[var(--radius-card)]";
    case "outline":
    default:
      return "surface-card";
  }
});
</script>

<template>
  <div
    :class="[
      'flex w-full flex-col items-center justify-center text-center',
      'transition-colors duration-200',
      sizeClass.root,
      variantClass,
    ]"
  >
    <div
      :class="[
        'mb-4 flex items-center justify-center rounded-[var(--radius-control)]',
        'accent-tile accent-tile-neutral',
        sizeClass.icon,
      ]"
    >
      <UIcon
        :name="props.icon || 'lucide:database'"
        :class="['text-current', sizeClass.iconGlyph]"
      />
    </div>

    <h3
      :class="[
        'max-w-xl text-pretty font-semibold text-[var(--text-primary)]',
        sizeClass.title,
      ]"
    >
      {{ props.title || 'No data available' }}
    </h3>

    <p
      v-if="props.description"
      :class="[
        'mt-2 max-w-xl text-balance text-[var(--text-tertiary)]',
        sizeClass.description,
      ]"
    >
      {{ props.description }}
    </p>

    <div
      v-if="props.action || $slots.default"
      class="mt-5 flex flex-wrap items-center justify-center gap-2"
    >
      <UButton
        v-if="props.action"
        :icon="props.action.icon"
        variant="soft"
        color="primary"
        size="sm"
        @click="props.action.onClick"
      >
        {{ props.action.label }}
      </UButton>
      <slot />
    </div>
  </div>
</template>
