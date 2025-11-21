<template>
  <component
    :is="animated ? 'div' : 'div'"
    ref="cardRef"
    class="rounded-xl border transition-all duration-300 relative overflow-hidden"
    :class="[
      variantClasses,
      sizeClasses[size],
      glassEffect && 'backdrop-blur-xl',
      elevated && 'shadow-md',
      className,
    ]"
    :style="{
      ...(glassEffect && {
        background: 'rgba(21, 27, 46, 0.6)',
        backdropFilter: 'blur(20px)',
      }),
      opacity: isVisible ? 1 : 0,
      transform: animated
        ? isVisible
          ? 'translateY(0)'
          : 'translateY(20px)'
        : undefined,
      transitionDelay: animationDelay,
    }"
    v-bind="$attrs"
  >
    <!-- Accent border at top -->
    <div
      v-if="accentBorder"
      class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7C3AED]/40 to-transparent"
    />

    <!-- Hover gradient overlay for settings variant -->
    <div
      v-if="variant === 'settings'"
      class="absolute inset-0 bg-gradient-to-br from-[#0066FF]/5 to-[#7C3AED]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
    />

    <!-- Content -->
    <div class="relative z-10">
      <slot />
    </div>
  </component>
</template>

<script setup lang="ts">

type CardVariant = "form" | "settings" | "stats" | "simple";
type CardSize = "compact" | "default" | "spacious";

interface Props {
  variant?: CardVariant;
  size?: CardSize;
  elevated?: boolean;
  animated?: boolean;
  glassEffect?: boolean;
  accentBorder?: boolean;
  className?: string;
  animationDelay?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "simple",
  size: "default",
  elevated: false,
  animated: false,
  glassEffect: false,
  accentBorder: false,
  className: "",
  animationDelay: "0ms",
});

const cardRef = ref<HTMLElement>();
const isVisible = ref(false);

const sizeClasses = {
  compact: "p-4",
  default: "p-6",
  spacious: "p-8",
};

const variantClasses = computed(() => {
  const variants = {
    form: [
      "bg-[var(--bg-surface)]",
      "border-0",
    ].join(" "),
    settings: [
      "bg-[var(--bg-elevated)]",
      "border-[var(--border-default)]",
      "hover:border-[#7C3AED]/30",
      "hover:shadow-md",
      "group cursor-pointer",
    ].join(" "),
    stats: [
      "bg-[var(--bg-surface)]",
      "border-[var(--border-default)]",
      "hover:border-[var(--border-strong)]",
      props.elevated && "shadow-sm hover:shadow-md",
    ]
      .filter(Boolean)
      .join(" "),
    simple: ["bg-[var(--bg-elevated)]", "border-[var(--border-default)]"].join(
      " "
    ),
  };

  return variants[props.variant];
});

onMounted(() => {
  if (props.animated) {
    nextTick(() => {
      isVisible.value = true;
    });
  } else {
    isVisible.value = true;
  }
});
</script>
