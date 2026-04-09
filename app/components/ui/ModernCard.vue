<template>
  <component
    :is="animated ? 'div' : 'div'"
    ref="cardRef"
    :class="[
      'relative overflow-hidden',
      borderless ? 'rounded-none bg-transparent border-0 shadow-none p-0' : 'rounded-2xl surface-card',
      !borderless && sizeClasses[size],
      variantClasses,
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
  accentBorder?: boolean;
  borderless?: boolean;
  className?: string;
  animationDelay?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "simple",
  size: "md",
  elevated: false,
  animated: false,
  accentBorder: false,
  borderless: false,
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
    form: "",
    settings: "group cursor-pointer transition-all duration-200 ease-in-out hover:-translate-y-px hover:shadow-md",
    stats: props.elevated ? "shadow-glow" : "",
    simple: "",
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
