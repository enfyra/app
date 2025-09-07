<script setup lang="ts">
interface StatCard {
  icon: string;
  iconColor: string;
  iconBg: string;
  value: string | number;
  label: string;
}

interface Props {
  title: string;
  description?: string;
  stats?: StatCard[];
  // Layout customization
  size?: "sm" | "md" | "lg";
  variant?: "default" | "simple" | "minimal";
  // Background customization
  showBackground?: boolean;
  backgroundGradient?: string;
  backgroundOpacity?: number;
  // Title customization
  titleSize?: "sm" | "md" | "lg" | "xl";
  titleColor?: string;
  showGradientText?: boolean;
  // Spacing customization
  paddingY?: string;
  paddingX?: string;
  marginBottom?: string;
  // Stats customization
  statsPosition?: "right" | "bottom";
  hideStatsOnMobile?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  description: undefined,
  stats: () => [],
  size: "lg",
  variant: "default",
  showBackground: true,
  backgroundGradient: "from-primary-500/10 via-primary-400/5 to-transparent",
  backgroundOpacity: 100,
  titleSize: "xl",
  titleColor: "",
  showGradientText: true,
  paddingY: "py-10",
  paddingX: "px-6",
  marginBottom: "mb-8",
  statsPosition: "right",
  hideStatsOnMobile: true,
});

// Computed styles
const containerClasses = computed(() => {
  const base = "relative";
  const overflow = props.showBackground ? "overflow-hidden" : "";
  const margin = props.marginBottom;
  return `${base} ${overflow} ${margin}`.trim();
});

const backgroundClasses = computed(() => {
  if (!props.showBackground) return "";
  return `absolute inset-0 bg-gradient-to-br ${props.backgroundGradient} rounded-2xl opacity-${props.backgroundOpacity}`;
});

const contentClasses = computed(() => {
  return `relative ${props.paddingY} ${props.paddingX}`;
});

const headerLayoutClasses = computed(() => {
  const direction = props.statsPosition === "bottom" ? "flex-col" : "flex-row";
  const justify =
    props.statsPosition === "right" ? "justify-between" : "justify-start";
  const items =
    props.statsPosition === "bottom" ? "items-start" : "items-center";
  const gap = props.statsPosition === "bottom" ? "gap-6" : "gap-4";
  return `flex ${direction} ${justify} ${items} ${gap}`.trim();
});

const titleClasses = computed(() => {
  const sizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
    xl: "text-4xl",
  };

  const sizeClass = sizes[props.titleSize];
  const gradientClass = props.showGradientText
    ? "bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent"
    : props.titleColor || "text-gray-900 dark:text-white";

  return `${sizeClass} font-bold ${gradientClass}`;
});

const statsClasses = computed(() => {
  const hiddenClass = props.hideStatsOnMobile ? "hidden lg:flex" : "flex";
  const direction = props.statsPosition === "bottom" ? "flex-wrap" : "flex-row";
  return `${hiddenClass} items-center gap-4 ${direction}`;
});
</script>

<template>
  <div :class="containerClasses">
    <!-- Background Gradient -->
    <div v-if="showBackground" :class="backgroundClasses" />

    <!-- Content -->
    <div :class="contentClasses">
      <div :class="headerLayoutClasses">
        <div>
          <h1 :class="titleClasses">
            {{ title }}
          </h1>
          <p v-if="description" class="mt-2 text-gray-600 dark:text-gray-400">
            {{ description }}
          </p>
          <!-- Badges Slot -->
          <div v-if="$slots.badges" class="mt-3 flex items-center gap-3">
            <slot name="badges" />
          </div>
        </div>

        <!-- Stats Cards -->
        <div v-if="stats.length > 0" :class="statsClasses">
          <div
            v-for="stat in stats"
            :key="stat.label"
            class="bg-white dark:bg-gray-800 rounded-xl px-6 py-4 border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-lg flex items-center justify-center"
                :class="stat.iconBg"
              >
                <UIcon
                  :name="stat.icon"
                  class="w-5 h-5"
                  :class="stat.iconColor"
                />
              </div>
              <div>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ stat.value }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ stat.label }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
