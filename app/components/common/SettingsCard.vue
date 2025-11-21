<template>
  <div
    :class="[
      'relative group transition-all duration-300 overflow-hidden cursor-pointer backdrop-blur-xl h-full flex flex-col',
      'bg-[var(--bg-surface)] border border-white/[0.06]',
      (isMobile || isTablet) ? 'rounded-lg p-2' : 'rounded-lg p-3',
      cardClass,
      'hover:shadow-md hover:-translate-y-0.5'
    ]"
  >
    <!-- Gradient overlay on hover -->
    <div :class="`absolute inset-0 bg-gradient-to-br ${hoverGradientClass} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`" />

    <!-- Header with icon + title -->
    <div :class="(isMobile || isTablet) ? 'relative flex items-center gap-2 mb-1.5' : 'relative flex items-center gap-3 mb-2'">
      <!-- Icon with gradient -->
      <div
        :class="[
          (isMobile || isTablet) ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl',
          'flex items-center justify-center flex-shrink-0 self-start transition-transform duration-300 group-hover:scale-110',
          iconBgClass
        ]"
      >
        <UIcon :name="icon" :class="(isMobile || isTablet) ? 'w-4 h-4 text-white' : 'w-5 h-5 text-white'" />
      </div>

      <!-- Title & Description -->
      <div class="flex-1 min-w-0 self-start">
        <h3 :class="(isMobile || isTablet) ? 'text-xs mb-0 font-semibold text-gray-100' : 'text-sm mb-0.5 font-semibold text-gray-100'">
          {{ title }}
        </h3>
        <p v-if="description && !isMobile && !isTablet" class="text-xs text-gray-400">
          {{ description }}
        </p>
      </div>

      <!-- Card Header Actions -->
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

    <!-- Content wrapper with flex-1 to push footer down -->
    <div class="flex-1">
      <!-- Stats List (Figma Performance Card Style) -->
      <div v-if="stats && stats.length && statsLayout === 'list'" :class="[(isMobile || isTablet) ? 'relative p-1.5 rounded-lg mb-1.5' : 'relative p-2 rounded-lg mb-2', 'bg-gray-900']">
        <div
          v-for="(stat, index) in stats"
          :key="stat.label"
          class="flex items-center justify-between"
          :class="(isMobile || isTablet) ? { 'mt-1': index > 0 } : { 'mt-1.5': index > 0 }"
        >
          <span :class="(isMobile || isTablet) ? 'text-2xs text-gray-400' : 'text-xs text-gray-400'">
            {{ stat.label }}
          </span>
          <div :class="(isMobile || isTablet) ? 'text-2xs font-medium text-gray-100' : 'text-xs font-medium text-gray-100'">
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

      <!-- Stats Grid (Figma Security Card Style) -->
      <div v-else-if="stats && stats.length && statsLayout === 'grid'" :class="(isMobile || isTablet) ? 'relative grid grid-cols-2 gap-1.5 mb-1.5' : 'relative grid grid-cols-2 gap-2 mb-2'">
        <div
          v-for="stat in stats"
          :key="stat.label"
          :class="[(isMobile || isTablet) ? 'text-center p-1.5 rounded-lg' : 'text-center p-2 rounded-lg', 'bg-gray-900/70']"
        >
          <div :class="(isMobile || isTablet) ? 'text-sm font-medium text-gray-100 mb-0' : 'text-base font-medium text-gray-100 mb-0.5'">
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
          <div :class="(isMobile || isTablet) ? 'text-2xs text-gray-400' : 'text-xs text-gray-400'">
            {{ stat.label }}
          </div>
        </div>
      </div>

      <!-- Custom body content -->
      <div v-if="$slots.default" :class="(isMobile || isTablet) ? 'relative mb-1.5' : 'relative mb-2'">
        <slot />
      </div>
    </div>

    <!-- Footer -->
    <div
      v-if="$slots.footer || (actions && actions.length > 0)"
      :class="[(isMobile || isTablet) ? 'relative pt-1.5 mt-1.5 border-t' : 'relative pt-2 mt-2 border-t', 'border-white/[0.06]']"
    >
      <!-- Custom footer content -->
      <slot name="footer" />

      <!-- Action Buttons -->
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
          :disabled="action.disabled"
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
  if (!componentName) return UButton; // default fallback
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
    primary: "bg-gradient-to-br from-primary-500 to-primary-600",
    success: "bg-gradient-to-br from-green-500 to-teal-500",
    warning: "bg-gradient-to-br from-amber-500 to-orange-500",
    error: "bg-gradient-to-br from-red-500 to-pink-500",
    neutral: "bg-gradient-to-br from-gray-500 to-gray-600",
  };
  return colorMap[props.iconColor];
});

const hoverGradientClass = computed(() => {
  const colorMap = {
    primary: "from-primary-500/5 to-primary-600/5",
    success: "from-green-500/5 to-teal-500/5",
    warning: "from-amber-500/5 to-orange-500/5",
    error: "from-red-500/5 to-pink-500/5",
    neutral: "from-gray-500/5 to-gray-600/5",
  };
  return colorMap[props.iconColor];
});

const { isMobile, isTablet } = useScreen();
</script>
