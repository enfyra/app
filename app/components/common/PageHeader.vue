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

onMounted(() => {
  nextTick(() => {
    isVisible.value = true;
  });
});
</script>

<template>
  <div
    class="border-b relative overflow-hidden transition-all duration-400"
    :style="{
      borderColor: 'var(--border-subtle)',
      background: 'var(--bg-elevated)',
      backgroundImage: gradientStyle,
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
    }"
  >
    <!-- Subtle gradient accent at top -->
    <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7C3AED]/30 to-transparent" />

    <!-- Content -->
    <div class="relative px-6" :class="isMinimal ? 'py-4' : 'py-5'">
      <!-- Title & Description -->
      <div
        class="space-y-1 transition-all duration-400"
        :style="{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
          transitionDelay: '100ms',
        }"
      >
        <h1
          class="font-semibold tracking-tight"
          :class="isMinimal ? 'text-2xl' : isStatsFocus ? 'text-4xl' : 'text-3xl'"
          :style="{ color: 'var(--text-primary)' }"
        >
          {{ title }}
        </h1>
        <p v-if="description" class="text-sm" :style="{ color: 'var(--text-tertiary)' }">
          {{ description }}
        </p>
      </div>

      <!-- Stats Cards -->
      <div
        v-if="stats && stats.length > 0"
        class="grid grid-cols-2 md:grid-cols-4 gap-4"
        :class="isStatsFocus ? 'mt-8' : 'mt-6'"
      >
        <div
          v-for="(stat, index) in stats"
          :key="index"
          class="rounded-xl border relative overflow-hidden group transition-all duration-300 hover:-translate-y-1"
          :class="isStatsFocus ? 'p-6' : 'p-4'"
          :style="{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border-default)',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transitionDelay: `${200 + index * 50}ms`,
          }"
        >
          <!-- Gradient glow on hover -->
          <div
            class="absolute inset-0 bg-gradient-to-br from-[#0066FF]/5 to-[#7C3AED]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          />

          <div class="relative">
            <div
              class="font-semibold"
              :class="isStatsFocus ? 'text-3xl' : 'text-2xl'"
              :style="{ color: 'var(--text-primary)' }"
            >
              {{ stat.value }}
            </div>
            <div class="text-sm mt-1" :style="{ color: 'var(--text-tertiary)' }">
              {{ stat.label }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
