<script setup lang="ts">
/**
 * PAGE HEADER (CommonPageHeader) - Page-specific hero section
 *
 * Position: Below UnifiedHeader
 * Shows: Page title, description, optional stats cards
 * Background: Radial gradient backgrounds (modern design)
 *
 * USAGE RULES:
 * - NO breadcrumbs here (use UnifiedHeader via useBreadcrumbRegistry)
 * - NO action buttons here (use UnifiedHeader via registry)
 * - Focus on: Title, Description, Stats/KPIs
 */

interface StatCard {
  label: string;
  value: string | number;
}

interface Props {
  title: string;
  description?: string;
  stats?: StatCard[];
  variant?: "default" | "minimal" | "stats-focus";
  gradient?: "purple" | "blue" | "cyan" | "none";
}

const props = withDefaults(defineProps<Props>(), {
  description: undefined,
  stats: () => [],
  variant: "default",
  gradient: "none",
});

// Radial gradient backgrounds (modern, subtle)
const gradientStyle = computed(() => {
  const gradients = {
    purple: "radial-gradient(at 0% 0%, rgba(124, 58, 237, 0.15) 0%, transparent 50%)",
    blue: "radial-gradient(at 100% 0%, rgba(0, 102, 255, 0.15) 0%, transparent 50%)",
    cyan: "radial-gradient(at 50% 0%, rgba(6, 182, 212, 0.12) 0%, transparent 50%)",
    none: undefined,
  };

  return gradients[props.gradient];
});

const isMinimal = computed(() => props.variant === "minimal");
const isStatsFocus = computed(() => props.variant === "stats-focus");

// Animation state
const isVisible = ref(false);

function triggerAnimation() {
  isVisible.value = false;
  setTimeout(() => {
    nextTick(() => {
      isVisible.value = true;
    });
  }, 50);
}

onMounted(() => {
  triggerAnimation();
});

watch(() => [props.title, props.description, props.variant, props.gradient, props.stats], () => {
  triggerAnimation();
}, { deep: true });

const { isMobile, isTablet } = useScreen();
</script>

<template>
  <div
    class="bg-gray-800/30 relative overflow-hidden"
    :style="{
      backgroundImage: gradientStyle,
    }"
  >
    <!-- Subtle gradient accent at top -->
    <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7C3AED]/30 to-transparent" />

    <!-- Content -->
    <div class="relative" :class="[(isMobile || isTablet) ? 'px-4' : 'px-6', isMinimal ? ((isMobile || isTablet) ? 'py-3' : 'py-4') : ((isMobile || isTablet) ? 'py-4' : 'py-5')]">
      <!-- Title & Description -->
      <div
        :class="(isMobile || isTablet) ? 'space-y-0.5' : 'space-y-1'"
        class="transition-all duration-400"
        :style="{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
          transitionDelay: '100ms',
        }"
      >
        <h1
          class="font-semibold tracking-tight text-gray-100"
          :class="(isMobile || isTablet) ? (isMinimal ? 'text-xl' : isStatsFocus ? 'text-2xl' : 'text-xl') : (isMinimal ? 'text-2xl' : isStatsFocus ? 'text-4xl' : 'text-3xl')"
        >
          {{ title }}
        </h1>
        <p v-if="description" :class="[(isMobile || isTablet) ? 'text-xs' : 'text-sm', 'text-gray-400']">
          {{ description }}
        </p>
      </div>

      <!-- Stats Cards -->
      <div
        v-if="stats && stats.length > 0"
        :class="[
          'grid grid-cols-2 md:grid-cols-4',
          (isMobile || isTablet) ? 'gap-2' : 'gap-4',
          isStatsFocus ? ((isMobile || isTablet) ? 'mt-4' : 'mt-8') : ((isMobile || isTablet) ? 'mt-3' : 'mt-6')
        ]"
      >
        <div
          v-for="(stat, index) in stats"
          :key="index"
          :class="[
            'border border-gray-700 bg-gray-900/50 relative overflow-hidden group transition-all duration-300 hover:-translate-y-1',
            (isMobile || isTablet) ? 'rounded-lg' : 'rounded-xl',
            isStatsFocus ? ((isMobile || isTablet) ? 'p-3' : 'p-6') : ((isMobile || isTablet) ? 'p-2.5' : 'p-4')
          ]"
          :style="{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transitionDelay: `${200 + index * 50}ms`,
          }"
        >
          <!-- Gradient glow on hover -->
          <div
            class="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          />

          <div class="relative">
            <div
              class="font-semibold text-gray-100"
              :class="(isMobile || isTablet) ? (isStatsFocus ? 'text-xl' : 'text-lg') : (isStatsFocus ? 'text-3xl' : 'text-2xl')"
            >
              {{ stat.value }}
            </div>
            <div :class="[(isMobile || isTablet) ? 'text-xs mt-0.5' : 'text-sm mt-1', 'text-gray-400']">
              {{ stat.label }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
