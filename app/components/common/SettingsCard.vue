<template>
  <div
    :class="[
      'relative group overflow-hidden cursor-pointer h-full flex flex-col surface-card-hover',
      (isMobile || isTablet) ? 'p-2' : 'p-4',
      topBadge ? 'pt-6' : '',
      contentLoading ? 'pointer-events-none cursor-wait' : '',
      cardClass,
    ]"
    :aria-busy="contentLoading"
  >
    <div
      v-if="topBadge && !contentLoading"
      class="absolute top-2 right-2 z-10"
    >
      <UBadge
        :color="topBadge.color || 'info'"
        variant="soft"
        size="xs"
      >
        {{ topBadge.label }}
      </UBadge>
    </div>


    <div :class="(isMobile || isTablet) ? 'relative flex items-center gap-2 mb-1.5' : 'relative flex items-center gap-3 mb-3'">

      <div
        :class="[
          (isMobile || isTablet) ? 'w-8 h-8 rounded-[var(--radius-control)]' : 'w-10 h-10 rounded-[var(--radius-control)]',
          'flex items-center justify-center flex-shrink-0 self-start',
          iconBgClass
        ]"
      >
        <div v-if="contentLoading" class="h-1/2 w-1/2 rounded-[var(--radius-subcontrol)] skeleton-gradient skeleton-pulse-slow" />
        <UIcon v-else :name="normalizedIcon" :class="(isMobile || isTablet) ? 'w-4 h-4 text-current' : 'w-5 h-5 text-current'" />
      </div>

      <div class="flex-1 min-w-0 self-start">
        <div v-if="contentLoading" class="space-y-2 pt-0.5">
          <div class="h-4 w-3/4 rounded skeleton-gradient skeleton-pulse-slow" />
          <div v-if="description && !isMobile && !isTablet" class="h-3 w-1/2 rounded skeleton-inline skeleton-pulse-slow" />
        </div>
        <h3 v-else :class="(isMobile || isTablet) ? 'text-xs mb-0 font-semibold text-[var(--text-primary)]' : 'text-sm mb-0.5 font-semibold text-[var(--text-primary)]'">
          {{ title }}
        </h3>
        <p v-if="!contentLoading && description && !isMobile && !isTablet" class="text-xs text-[var(--text-tertiary)]">
          {{ description }}
        </p>
      </div>

      <div
        v-if="headerActions && headerActions.length > 0 && !contentLoading"
        :class="(isMobile || isTablet) ? 'flex items-center gap-1 flex-shrink-0' : 'flex items-center gap-2 flex-shrink-0'"
      >
        <component
          v-for="(action, index) in headerActions"
          :key="index"
          :is="getComponent(action.component)"
          v-bind="{
            ...getDefaultProps(action.component, 'header'),
            ...resolveProps(action.props),
            ...((isMobile || isTablet) && action.component === 'UButton' ? { size: 'xs', class: 'rounded-full !aspect-square' } : {})
          }"
          @click="action.onClick"
          @update:model-value="action.onUpdate"
        >
          <template v-if="action.label && !isMobile && !isTablet">{{ action.label }}</template>
        </component>
      </div>
      <div v-else-if="contentLoading && headerActions && headerActions.length > 0" class="h-7 w-10 rounded-[var(--radius-control)] skeleton-inline skeleton-pulse-slow" />
    </div>

    <div class="flex-1">

      <div v-if="stats && stats.length && statsLayout === 'list'" :class="[(isMobile || isTablet) ? 'relative p-1.5 mb-1.5' : 'relative p-2.5 mb-3', 'surface-muted']">
        <div
          v-for="(stat, index) in stats"
          :key="stat.label"
          class="flex items-center justify-between"
          :class="(isMobile || isTablet) ? { 'mt-1': index > 0 } : { 'mt-1.5': index > 0 }"
        >
          <span :class="(isMobile || isTablet) ? 'text-2xs text-[var(--text-tertiary)]' : 'text-xs text-[var(--text-tertiary)]'">
            {{ stat.label }}
          </span>
          <div :class="(isMobile || isTablet) ? 'text-2xs font-medium text-[var(--text-primary)]' : 'text-xs font-medium text-[var(--text-primary)]'">
            <div v-if="contentLoading" class="h-3 w-16 rounded skeleton-gradient skeleton-pulse-slow" />
            <div v-else-if="stat.values && stat.values.length > 0" class="flex gap-1 flex-wrap justify-end">
              <component
                v-for="(item, idx) in stat.values"
                :key="idx"
                :is="getComponent(stat.component)"
                v-bind="{ ...getDefaultProps(stat.component, 'stats'), ...resolveProps(stat.props), ...resolveProps(item.props) }"
              >
                {{ item.value }}
              </component>
            </div>
            <component
              v-else-if="stat.component"
              :is="getComponent(stat.component)"
              v-bind="{ ...getDefaultProps(stat.component, 'stats'), ...resolveProps(stat.props) }"
            >
              {{ stat.value }}
            </component>
            <template v-else>{{ stat.value }}</template>
          </div>
        </div>
      </div>

      <div v-else-if="stats && stats.length && statsLayout === 'grid'" :class="(isMobile || isTablet) ? 'relative grid grid-cols-2 gap-1.5 mb-1.5' : 'relative grid grid-cols-2 gap-2 mb-3'">
        <div
          v-for="stat in stats"
          :key="stat.label"
          :class="[(isMobile || isTablet) ? 'text-center p-1.5' : 'text-center p-2.5', 'surface-muted']"
        >
          <div :class="(isMobile || isTablet) ? 'text-sm font-medium text-[var(--text-primary)] mb-0' : 'text-base font-medium text-[var(--text-primary)] mb-0.5'">
            <div v-if="contentLoading" class="mx-auto h-4 w-12 rounded skeleton-gradient skeleton-pulse-slow" />
            <div v-else-if="stat.values && stat.values.length > 0" class="flex gap-1 flex-wrap justify-center">
              <component
                v-for="(item, idx) in stat.values"
                :key="idx"
                :is="getComponent(stat.component)"
                v-bind="{ ...getDefaultProps(stat.component, 'stats'), ...resolveProps(stat.props), ...resolveProps(item.props) }"
              >
                {{ item.value }}
              </component>
            </div>
            <component
              v-else-if="stat.component"
              :is="getComponent(stat.component)"
              v-bind="{ ...getDefaultProps(stat.component, 'stats'), ...resolveProps(stat.props) }"
            >
              {{ stat.value }}
            </component>
            <template v-else>{{ stat.value }}</template>
          </div>
          <div :class="(isMobile || isTablet) ? 'text-2xs text-[var(--text-tertiary)]' : 'text-xs text-[var(--text-tertiary)]'">
            {{ stat.label }}
          </div>
        </div>
      </div>

      <div v-if="$slots.default && !contentLoading" :class="(isMobile || isTablet) ? 'relative mb-1.5' : 'relative mb-3'">
        <slot />
      </div>
    </div>

    <div
      v-if="$slots.footer || (actions && actions.length > 0)"
      class="relative z-10 pt-3 mt-3"
      style="border-top: 1px solid var(--border-default);"
    >

      <slot name="footer" />

      <div v-if="contentLoading && actions && actions.length" :class="(isMobile || isTablet) ? 'flex justify-end gap-1.5' : 'flex justify-end gap-2'">
        <div
          v-for="action in actions"
          :key="action.label"
          class="h-8 w-20 rounded-[var(--radius-control)] skeleton-gradient skeleton-pulse-slow"
        />
      </div>
      <div v-else-if="actions && actions.length" :class="(isMobile || isTablet) ? 'flex justify-end gap-1.5' : 'flex justify-end gap-2'">
        <UButton
          v-for="action in actions"
          :key="action.label"
          v-bind="{
            ...resolveProps(action.props),
            ...((isMobile || isTablet) ? { size: 'xs', class: 'rounded-full !aspect-square' } : {})
          }"
          :to="action.to"
          :loading="action.loading"
          :disabled="action.disabled || action.loading"
          @click="action.onClick"
          :class="[
            action.onClick || action.to ? 'cursor-pointer' : '',
            (isMobile || isTablet) ? '' : 'h-9 px-4 justify-center'
          ]"
        >
          <template v-if="!isMobile && !isTablet">{{ action.label }}</template>
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { UAvatar, UBadge, UButton, USwitch, UChip, UIcon, UKbd, UTooltip, MethodBadge } from "#components";

interface Stat {
  label: string;
  value?: string | number;
  values?: Array<{ value: string | number; props?: Record<string, any> }>;
  component?: any;
  props?: Record<string, any>;
}

interface Action {
  label: string;
  props?: Record<string, any>;
  to?: string;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  block?: boolean;
}

interface HeaderAction {
  component?: string;
  props?: Record<string, any>;
  label?: string;
  onClick?: (e?: Event) => void;
  onUpdate?: (value: any) => void;
}

interface Props {
  title: string;
  description?: string;
  icon: string;
  iconColor?: "primary" | "success" | "warning" | "error" | "neutral";
  stats?: Stat[];
  statsLayout?: "list" | "grid";
  actions?: Action[];
  headerActions?: HeaderAction[];
  cardClass?: string;
  topBadge?: { label: string; color?: "error" | "info" | "success" | "primary" | "secondary" | "warning" | "neutral" };
  contentLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  iconColor: "primary",
  statsLayout: "list",
  cardClass: "",
  contentLoading: false,
});

const componentMap = {
  UButton,
  USwitch,
  UAvatar,
  UBadge,
  UChip,
  UIcon,
  UKbd,
  UTooltip,
  MethodBadge,
};

const getComponent = (componentName?: string) => {
  if (!componentName) return UButton;
  return componentMap[componentName as keyof typeof componentMap] || UButton;
};

const getDefaultProps = (componentName?: string, context: 'header' | 'stats' = 'header') => {
  const defaults = {
    header: {
      UButton: { size: 'lg' },
      UBadge: { size: 'md' },
      UAvatar: { size: 'xs' },
      USwitch: { size: 'md' },
      UChip: { size: 'md' },
      UIcon: { size: '4' },
    },
    stats: {
      UBadge: { size: 'md', variant: 'soft' },
      UChip: { size: 'lg', variant: 'soft' },
      UButton: { size: 'xs', variant: 'ghost' },
      UIcon: { size: '4' },
      UKbd: { size: 'xs' },
      MethodBadge: { size: 'xs' },
    }
  };

  if (!componentName) return {};
  return defaults[context]?.[componentName as keyof typeof defaults[typeof context]] || {};
};

function resolveProps(input?: Record<string, any>) {
  if (!input) return {};

  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, unref(value)]),
  );
}

const normalizedIcon = computed(() => props.icon.replace(/\s+/g, ''));

const iconBgClass = computed(() => {
  const colorMap = {
    primary: "accent-tile accent-tile-primary",
    success: "accent-tile accent-tile-success",
    warning: "accent-tile accent-tile-warning",
    error: "accent-tile accent-tile-error",
    neutral: "accent-tile accent-tile-neutral",
  };
  return colorMap[props.iconColor];
});


const { isMobile, isTablet } = useScreen();
</script>
