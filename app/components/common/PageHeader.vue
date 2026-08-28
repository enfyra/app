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

const leadingIconShellClass = computed(() =>
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-[var(--brand-700)] bg-[var(--state-primary-soft-bg)] text-[var(--state-primary-soft-text)]",
);

const leadingIconGlyphClass = computed(() =>
  "h-4 w-4",
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
  return props.gradient === "none" ? "" : "page-header-accent";
});

const isStatsFocus = computed(() => props.variant === "stats-focus");

function handlePageHeaderActionClick(action: any) {
  return action.onClick?.();
}
</script>

<template>
  <div class="page-header-shell relative" :class="headerStripClass">
    
    <div class="page-header-inner relative px-5 py-3 lg:px-6">
      <div
        class="flex gap-4"
        :class="(isMobile || isTablet) ? 'flex-col' : 'flex-row items-center justify-between'"
      >
        
        <div class="flex min-w-0 flex-1 items-center gap-3">
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
          <div class="relative min-w-0 flex-1">
            <div class="header-title-stack">
            <Transition name="page-header-fade">
              <div :key="title" class="space-y-0">
                <h1
                  class="min-w-0 break-words font-bold tracking-normal text-[var(--text-primary)]"
                  :class="(isMobile || isTablet) ? 'text-lg leading-5' : 'text-xl leading-6'"
                >
                  {{ title }}
                </h1>
                <p
                  v-if="description"
                  class="text-xs leading-4 text-[var(--text-tertiary)]"
                >
                  {{ description }}
                </p>
              </div>
            </Transition>
            </div>
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
                :loading-auto="true"
                :disabled="
                  typeof action.disabled === 'boolean'
                    ? action.disabled
                    : unref(action.disabled)
                "
                :square="isHeaderActionIconOnly(action, isMobile || isTablet)"
                @click="handlePageHeaderActionClick(action)"
                :class="getHeaderActionButtonClass(action)"
                :aria-label="action.ariaLabel || (isRef(action.label) ? unref(action.label) : action.label) || action.id"
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
                :loading-auto="true"
                :disabled="
                  typeof action.disabled === 'boolean'
                    ? action.disabled
                    : unref(action.disabled)
                "
                :square="isHeaderActionIconOnly(action, isMobile || isTablet)"
                @click="handlePageHeaderActionClick(action)"
                :class="getHeaderActionButtonClass(action)"
                :aria-label="action.ariaLabel || (isRef(action.label) ? unref(action.label) : action.label) || action.id"
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
            'surface-card relative overflow-hidden group',
            'rounded-[var(--radius-card)]',
            isStatsFocus ? ((isMobile || isTablet) ? 'p-3' : 'p-6') : ((isMobile || isTablet) ? 'p-2.5' : 'p-4')
          ]"
        >
          
          <div
            class="absolute inset-0 bg-[var(--state-primary-soft-bg)] opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-emphasized)]"
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

<style scoped>
.page-header-shell {
  border: 1px solid var(--card-border);
  border-radius: var(--radius-card);
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--brand-500) 5%, transparent), transparent 62%),
    var(--card-bg);
  box-shadow: var(--card-shadow);
  backdrop-filter: blur(18px);
}

.page-header-shell::before {
  display: none;
}

.page-header-inner {
  min-height: 56px;
}

.page-header-fade-enter-active,
.page-header-fade-leave-active {
  transition: opacity var(--duration-fast) var(--ease-standard);
}

.header-title-stack {
  display: grid;
}

.header-title-stack > * {
  grid-area: 1 / 1;
}

.page-header-fade-enter-from,
.page-header-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .page-header-fade-enter-active,
  .page-header-fade-leave-active {
    transition-duration: 1ms !important;
  }
}
</style>
