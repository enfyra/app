<script setup lang="ts">
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
  leadingIcon?: string;
  hideLeadingIcon?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  description: undefined,
  stats: () => [],
  variant: "default",
  gradient: "none",
  hideLeadingIcon: false,
});

const route = useRoute();
const { findMenuIconForPath } = useMenuRegistry();

const resolvedLeadingIcon = computed(() => {
  if (props.hideLeadingIcon) {
    return undefined;
  }
  if (props.leadingIcon !== undefined) {
    return props.leadingIcon || undefined;
  }
  return findMenuIconForPath(route.path);
});

const leadingIconShellClass = computed(() => {
  const isMin = props.variant === "minimal";
  const base = isMin
    ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
    : "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl";
  const g = props.gradient;
  if (g === "purple") {
    return `${base} bg-gradient-to-br from-violet-500/25 to-fuchsia-500/20 text-violet-600 dark:from-violet-400/20 dark:to-fuchsia-500/15 dark:text-violet-300`;
  }
  if (g === "blue") {
    return `${base} bg-gradient-to-br from-indigo-500/25 to-cyan-500/15 text-indigo-600 dark:from-indigo-400/20 dark:to-cyan-400/15 dark:text-indigo-300`;
  }
  if (g === "cyan") {
    return `${base} bg-gradient-to-br from-cyan-500/25 to-primary/20 text-cyan-600 dark:from-cyan-400/20 dark:to-primary/25 dark:text-cyan-300`;
  }
  return `${base} bg-[var(--surface-muted)] text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]`;
});

const leadingIconGlyphClass = computed(() =>
  props.variant === "minimal" ? "h-5 w-5" : "h-6 w-6",
);

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

const headerStripClass = computed(() => {
  const g = props.gradient;
  if (g === "none") {
    return "";
  }
  if (g === "cyan") {
    return "bg-gradient-to-r from-cyan-500/[0.07] via-[var(--surface-muted)]/80 to-transparent dark:from-cyan-400/[0.09] dark:via-[var(--surface-muted)]/50 dark:to-transparent";
  }
  if (g === "purple") {
    return "bg-gradient-to-r from-violet-500/[0.08] via-[var(--surface-muted)]/78 to-transparent dark:from-violet-400/[0.09] dark:via-[var(--surface-muted)]/48 dark:to-transparent";
  }
  if (g === "blue") {
    return "bg-gradient-to-r from-indigo-500/[0.08] via-[var(--surface-muted)]/78 to-transparent dark:from-indigo-400/[0.09] dark:via-[var(--surface-muted)]/48 dark:to-transparent";
  }
  return "";
});

const isMinimal = computed(() => props.variant === "minimal");
const isStatsFocus = computed(() => props.variant === "stats-focus");

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

watch(
  () => [
    props.title,
    props.description,
    props.variant,
    props.gradient,
    props.stats,
    resolvedLeadingIcon.value,
    props.leadingIcon,
    props.hideLeadingIcon,
  ],
  () => {
    triggerAnimation();
  },
  { deep: true },
);
</script>

<template>
  <div
    class="relative overflow-hidden"
    :class="headerStripClass"
    :style="{
      borderBottomColor: 'var(--border-default)',
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid'
    }"
  >
    
    <div class="relative" :class="[(isMobile || isTablet) ? 'px-4' : 'px-6', isMinimal ? ((isMobile || isTablet) ? 'py-3' : 'py-4') : ((isMobile || isTablet) ? 'py-4' : 'py-5')]">
      <div class="flex flex-col gap-4" :class="(isMobile || isTablet) ? '' : 'flex-row items-center justify-between'">
        
        <div class="flex min-w-0 flex-1 items-start gap-4">
          <div
            v-if="resolvedLeadingIcon"
            :class="leadingIconShellClass"
            aria-hidden="true"
          >
            <UIcon
              :name="resolvedLeadingIcon"
              :class="leadingIconGlyphClass"
            />
          </div>
          <div
            :class="(isMobile || isTablet) ? 'space-y-0.5' : 'space-y-1'"
            class="min-w-0 flex-1 transition-all duration-400"
            :style="{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
              transitionDelay: '100ms',
            }"
          >
            <h1
              class="font-semibold tracking-tight text-[var(--text-primary)]"
              :class="(isMobile || isTablet) ? (isMinimal ? 'text-xl' : isStatsFocus ? 'text-2xl' : 'text-xl') : (isMinimal ? 'text-2xl' : isStatsFocus ? 'text-4xl' : 'text-3xl')"
            >
              {{ title }}
            </h1>
            <p
              v-if="description"
              :class="[(isMobile || isTablet) ? 'text-xs' : 'text-sm', 'text-[var(--text-tertiary)]']"
            >
              {{ description }}
            </p>
          </div>
        </div>

        <div v-if="hasActions" class="flex items-center gap-2 shrink-0" :class="(isMobile || isTablet) ? 'w-full' : ''">
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
                :class="[
                  action.class,
                  (isRef(action.variant) ? unref(action.variant) : action.variant) === 'outline' &&
                  (isRef(action.color) ? unref(action.color) : action.color) === 'neutral'
                    ? '!bg-[var(--surface-default)] !border !border-[var(--border-strong)] !text-[var(--text-primary)] hover:!bg-[var(--surface-muted)]'
                    : ''
                ]"
              />
            </PermissionGate>
          </template>
          <template v-for="action in rightActions" :key="action.key || action.id">
            <PermissionGate :condition="action.permission">
              <component
                v-if="action.component"
                :is="action.component"
                v-bind="{ ...action.props, class: (isMobile || isTablet) ? 'w-full flex-1' : action.props?.class }"
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
                :class="[
                  action.class,
                  (isRef(action.variant) ? unref(action.variant) : action.variant) === 'outline' &&
                  (isRef(action.color) ? unref(action.color) : action.color) === 'neutral'
                    ? '!bg-[var(--surface-default)] !border !border-[var(--border-strong)] !text-[var(--text-primary)] hover:!bg-[var(--surface-muted)]'
                    : ''
                ]"
              />
            </PermissionGate>
          </template>
        </div>
      </div>

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
            'surface-card relative overflow-hidden group transition-all duration-300',
            (isMobile || isTablet) ? 'rounded-lg' : 'rounded-xl',
            isStatsFocus ? ((isMobile || isTablet) ? 'p-3' : 'p-6') : ((isMobile || isTablet) ? 'p-2.5' : 'p-4')
          ]"
          :style="{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transitionDelay: `${200 + index * 50}ms`,
          }"
        >
          
          <div
            class="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-brand-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          />

          <div class="relative">
            <div
              class="font-semibold text-[var(--text-primary)]"
              :class="(isMobile || isTablet) ? (isStatsFocus ? 'text-xl' : 'text-lg') : (isStatsFocus ? 'text-3xl' : 'text-2xl')"
            >
              {{ stat.value }}
            </div>
            <div :class="[(isMobile || isTablet) ? 'text-xs mt-0.5' : 'text-sm mt-1', 'text-[var(--text-tertiary)]']">
              {{ stat.label }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
