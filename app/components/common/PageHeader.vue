<script setup lang="ts">
/**
 * PAGE HEADER (CommonPageHeader) - Page-specific hero section
 *
 * Position: Below UnifiedHeader
 * Shows: Page title, description, optional stats cards, and actions
 * Background: Radial gradient backgrounds (modern design)
 *
 * USAGE RULES:
 * - NO breadcrumbs here (use UnifiedHeader via useBreadcrumbRegistry)
 * - Actions from SubHeader registry are displayed on the right
 * - Focus on: Title, Description, Stats/KPIs, Actions
 */

import { isRef, unref } from "vue";

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

const { subHeaderActions } = useSubHeaderActionRegistry();
const { isMobile, isTablet } = useScreen();

const leftActions = computed(() => {
  return subHeaderActions.value.filter((a) => {
    const showValue =
      a.show === undefined ? true : isRef(a.show) ? unref(a.show) : a.show;
    return a && a.side === "left" && showValue;
  });
});

const rightActions = computed(() => {
  return subHeaderActions.value.filter((a) => {
    const showValue =
      a.show === undefined ? true : isRef(a.show) ? unref(a.show) : a.show;
    return a && a.side === "right" && showValue;
  });
});

const hasActions = computed(() => {
  return leftActions.value.length > 0 || rightActions.value.length > 0;
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
</script>

<template>
  <div
    class="relative overflow-hidden"
    :style="{
      borderBottomColor: 'var(--border-default)',
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid'
    }"
  >
    <!-- Content -->
    <div class="relative" :class="[(isMobile || isTablet) ? 'px-4' : 'px-6', isMinimal ? ((isMobile || isTablet) ? 'py-3' : 'py-4') : ((isMobile || isTablet) ? 'py-4' : 'py-5')]">
      <div class="flex flex-col gap-4" :class="(isMobile || isTablet) ? '' : 'flex-row items-center justify-between'">
        <!-- Left: Title & Description -->
        <div class="flex-1 min-w-0">
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
              class="font-semibold tracking-tight text-gray-800 dark:text-white/90"
          :class="(isMobile || isTablet) ? (isMinimal ? 'text-xl' : isStatsFocus ? 'text-2xl' : 'text-xl') : (isMinimal ? 'text-2xl' : isStatsFocus ? 'text-4xl' : 'text-3xl')"
        >
          {{ title }}
        </h1>
            <p v-if="description" :class="[(isMobile || isTablet) ? 'text-xs' : 'text-sm', 'text-gray-500 dark:text-gray-400']">
          {{ description }}
        </p>
          </div>
        </div>

        <!-- Right: Actions -->
        <div v-if="hasActions" class="flex items-center space-x-2 shrink-0" :class="(isMobile || isTablet) ? 'justify-end' : ''">
          <template v-for="action in leftActions" :key="action.key || action.id">
            <PermissionGate :condition="action.permission">
              <component
                v-if="action.component"
                :is="action.component"
                v-bind="action.props"
              />
              <UButton
                v-else
                :icon="isRef(action.icon) ? unref(action.icon) : action.icon"
                :label="(isMobile || isTablet) ? undefined : (isRef(action.label) ? unref(action.label) : action.label)"
                :variant="
                  (isRef(action.variant)
                    ? unref(action.variant)
                    : action.variant) || 'soft'
                "
                :color="
                  (isRef(action.color) ? unref(action.color) : action.color) ||
                  'neutral'
                "
                :size="(isMobile || isTablet) ? 'lg' : action.size || 'md'"
                :disabled="
                  typeof action.disabled === 'boolean'
                    ? action.disabled
                    : unref(action.disabled)
                "
                @click="action.onClick"
                :class="action.class"
              />
            </PermissionGate>
          </template>
          <template v-for="action in rightActions" :key="action.key || action.id">
            <PermissionGate :condition="action.permission">
              <component
                v-if="action.component"
                :is="action.component"
                v-bind="action.props"
              />
              <UButton
                v-else
                :icon="isRef(action.icon) ? unref(action.icon) : action.icon"
                :label="(isMobile || isTablet) ? undefined : (isRef(action.label) ? unref(action.label) : action.label)"
                :variant="
                  (isRef(action.variant)
                    ? unref(action.variant)
                    : action.variant) || 'soft'
                "
                :color="
                  (isRef(action.color) ? unref(action.color) : action.color) ||
                  'neutral'
                "
                :size="(isMobile || isTablet) ? 'lg' : action.size || 'md'"
                :disabled="
                  typeof action.disabled === 'boolean'
                    ? action.disabled
                    : unref(action.disabled)
                "
                @click="action.onClick"
                :class="action.class"
              />
            </PermissionGate>
          </template>
        </div>
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
            'border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] relative overflow-hidden group transition-all duration-300',
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
            class="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-brand-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          />

          <div class="relative">
            <div
              class="font-semibold text-gray-800 dark:text-white/90"
              :class="(isMobile || isTablet) ? (isStatsFocus ? 'text-xl' : 'text-lg') : (isStatsFocus ? 'text-3xl' : 'text-2xl')"
            >
              {{ stat.value }}
            </div>
            <div :class="[(isMobile || isTablet) ? 'text-xs mt-0.5' : 'text-sm mt-1', 'text-gray-500 dark:text-gray-400']">
              {{ stat.label }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
