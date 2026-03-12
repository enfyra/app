<template>
  <div
    :class="[
      'relative group overflow-hidden cursor-pointer h-full flex flex-col glass-card',
      (isMobile || isTablet) ? 'rounded-xl p-2' : 'rounded-2xl p-4',
      topBadge ? 'pt-6' : '',
      cardClass,
    ]"
  >
    <div
      v-if="topBadge"
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

    <div :class="`absolute inset-0 bg-gradient-to-br ${hoverGradientClass} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`" />

    <div class="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5 pointer-events-none" />

    <div :class="(isMobile || isTablet) ? 'relative flex items-center gap-2 mb-1.5' : 'relative flex items-center gap-3 mb-3'">

      <div
        :class="[
          (isMobile || isTablet) ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl',
          'flex items-center justify-center flex-shrink-0 self-start',
          iconBgClass
        ]"
      >
        <UIcon :name="icon" :class="(isMobile || isTablet) ? 'w-4 h-4 text-white' : 'w-5 h-5 text-white'" />
      </div>

      <div class="flex-1 min-w-0 self-start">
        <h3 :class="(isMobile || isTablet) ? 'text-xs mb-0 font-semibold text-gray-800 dark:text-white/90' : 'text-sm mb-0.5 font-semibold text-gray-800 dark:text-white/90'">
          {{ title }}
        </h3>
        <p v-if="description && !isMobile && !isTablet" class="text-xs text-gray-500 dark:text-gray-400">
          {{ description }}
        </p>
      </div>

      <div
        v-if="headerActions && headerActions.length > 0"
        :class="(isMobile || isTablet) ? 'flex items-center gap-1 flex-shrink-0' : 'flex items-center gap-2 flex-shrink-0'"
      >
        <component
          v-for="(action, index) in headerActions"
          :key="index"
          :is="getComponent(action.component)"
          v-bind="{
            ...getDefaultProps(action.component, 'header'),
            ...(action.props || {}),
            ...((isMobile || isTablet) && action.component === 'UButton' ? { size: 'xs', class: 'rounded-full !aspect-square' } : {})
          }"
          @click="action.onClick"
          @update:model-value="action.onUpdate"
        >
          <template v-if="action.label && !isMobile && !isTablet">{{ action.label }}</template>
        </component>
      </div>
    </div>

    <div class="flex-1">

      <div v-if="stats && stats.length && statsLayout === 'list'" :class="[(isMobile || isTablet) ? 'relative p-1.5 rounded-xl mb-1.5' : 'relative p-2.5 rounded-xl mb-3', 'glass-subtle']">
        <div
          v-for="(stat, index) in stats"
          :key="stat.label"
          class="flex items-center justify-between"
          :class="(isMobile || isTablet) ? { 'mt-1': index > 0 } : { 'mt-1.5': index > 0 }"
        >
          <span :class="(isMobile || isTablet) ? 'text-2xs text-gray-500 dark:text-gray-400' : 'text-xs text-gray-500 dark:text-gray-400'">
            {{ stat.label }}
          </span>
          <div :class="(isMobile || isTablet) ? 'text-2xs font-medium text-gray-800 dark:text-white/90' : 'text-xs font-medium text-gray-800 dark:text-white/90'">
            <div v-if="stat.values && stat.values.length > 0" class="flex gap-1 flex-wrap justify-end">
              <component
                v-for="(item, idx) in stat.values"
                :key="idx"
                :is="getComponent(stat.component)"
                v-bind="{ ...getDefaultProps(stat.component, 'stats'), ...(stat.props || {}), ...(item.props || {}) }"
              >
                {{ item.value }}
              </component>
            </div>
            <component
              v-else-if="stat.component"
              :is="getComponent(stat.component)"
              v-bind="{ ...getDefaultProps(stat.component, 'stats'), ...(stat.props || {}) }"
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
          :class="[(isMobile || isTablet) ? 'text-center p-1.5 rounded-xl' : 'text-center p-2.5 rounded-xl', 'glass-subtle']"
        >
          <div :class="(isMobile || isTablet) ? 'text-sm font-medium text-gray-800 dark:text-white/90 mb-0' : 'text-base font-medium text-gray-800 dark:text-white/90 mb-0.5'">
            <div v-if="stat.values && stat.values.length > 0" class="flex gap-1 flex-wrap justify-center">
              <component
                v-for="(item, idx) in stat.values"
                :key="idx"
                :is="getComponent(stat.component)"
                v-bind="{ ...getDefaultProps(stat.component, 'stats'), ...(stat.props || {}), ...(item.props || {}) }"
              >
                {{ item.value }}
              </component>
            </div>
            <component
              v-else-if="stat.component"
              :is="getComponent(stat.component)"
              v-bind="{ ...getDefaultProps(stat.component, 'stats'), ...(stat.props || {}) }"
            >
              {{ stat.value }}
            </component>
            <template v-else>{{ stat.value }}</template>
          </div>
          <div :class="(isMobile || isTablet) ? 'text-2xs text-gray-500 dark:text-gray-400' : 'text-xs text-gray-500 dark:text-gray-400'">
            {{ stat.label }}
          </div>
        </div>
      </div>

      <div v-if="$slots.default" :class="(isMobile || isTablet) ? 'relative mb-1.5' : 'relative mb-3'">
        <slot />
      </div>
    </div>

    <div
      v-if="$slots.footer || (actions && actions.length > 0)"
      class="relative z-10 pt-3 mt-3"
      style="border-top: 1px solid var(--glass-border);"
    >

      <slot name="footer" />

      <div v-if="actions && actions.length" :class="(isMobile || isTablet) ? 'flex justify-end gap-1.5' : 'flex justify-end gap-2'">
        <UButton
          v-for="action in actions"
          :key="action.label"
          v-bind="{
            ...action.props,
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
import { UAvatar, UBadge, UButton, USwitch, UChip, UIcon, UKbd, UTooltip } from "#components";

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
  topBadge?: { label: string; color?: string };
}

const props = withDefaults(defineProps<Props>(), {
  iconColor: "primary",
  statsLayout: "list",
  cardClass: "",
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
    }
  };

  if (!componentName) return {};
  return defaults[context]?.[componentName as keyof typeof defaults[typeof context]] || {};
};

const iconBgClass = computed(() => {
  const colorMap = {
    primary: "bg-gradient-to-br from-violet-500 to-indigo-600",
    success: "bg-gradient-to-br from-emerald-500 to-teal-500",
    warning: "bg-gradient-to-br from-amber-500 to-orange-500",
    error: "bg-gradient-to-br from-rose-500 to-pink-500",
    neutral: "bg-gradient-to-br from-gray-500 to-slate-600",
  };
  return colorMap[props.iconColor];
});

const hoverGradientClass = computed(() => {
  const colorMap = {
    primary: "from-violet-500/10 to-cyan-500/5",
    success: "from-emerald-500/10 to-teal-500/5",
    warning: "from-amber-500/10 to-orange-500/5",
    error: "from-rose-500/10 to-pink-500/5",
    neutral: "from-gray-500/10 to-slate-500/5",
  };
  return colorMap[props.iconColor];
});

const { isMobile, isTablet } = useScreen();
</script>
