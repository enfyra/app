<template>
  <component
    :is="animated ? 'div' : 'div'"
    ref="cardRef"
    class="rounded-2xl relative overflow-hidden"
    :class="[
      variantClasses,
      sizeClasses[size],
      glassEffect ? 'glass-card' : '',
      elevated && 'shadow-theme-md',
      className,
    ]"
    :style="{
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

    <div
      v-if="accentBorder"
      class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent"
    />

    <div
      v-if="variant === 'settings'"
      class="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
    />

    <div class="relative z-10">
      <slot />
    </div>
  </component>
</template>

<script setup lang="ts">

type CardVariant = "form" | "settings" | "stats" | "simple";
type CardSize = "sm" | "md" | "lg";

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
  size: "md",
  elevated: false,
  animated: false,
  glassEffect: true,
  accentBorder: false,
  className: "",
  animationDelay: "0ms",
});

const cardRef = ref<HTMLElement>();
const isVisible = ref(false);

const sizeClasses = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const variantClasses = computed(() => {
  const variants = {
    form: [
      "glass-card",
    ].join(" "),
    settings: [
      "glass-card-hover",
      "group cursor-pointer",
    ].join(" "),
    stats: [
      "glass-card",
      props.elevated && "shadow-glow",
    ]
      .filter(Boolean)
      .join(" "),
    simple: [
      "glass-card",
    ].join(" "),
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
