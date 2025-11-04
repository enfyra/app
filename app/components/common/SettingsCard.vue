<template>
  <div
    :class="[
      'relative group transition-all duration-300 border overflow-hidden cursor-pointer backdrop-blur-xl h-full flex flex-col',
      (isMobile || isTablet) ? 'rounded-lg p-3' : 'rounded-xl p-5',
      cardClass,
      'hover:shadow-md hover:-translate-y-0.5'
    ]"
    :style="{
      background: 'var(--bg-elevated)',
      borderColor: 'var(--border-default)',
    }"
  >
    <!-- Gradient overlay on hover -->
    <div class="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

    <!-- Header with icon + title -->
    <div :class="(isMobile || isTablet) ? 'relative flex items-center gap-2 mb-2' : 'relative flex items-center gap-4 mb-3'">
      <!-- Icon with gradient -->
      <div
        :class="(isMobile || isTablet) ? 'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 self-start' : 'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 self-start'"
        style="background: linear-gradient(135deg, #0066FF 0%, #7C3AED 100%)"
      >
        <UIcon :name="icon" :class="(isMobile || isTablet) ? 'w-4 h-4 text-white' : 'w-5 h-5 text-white'" />
      </div>

      <!-- Title & Description -->
      <div class="flex-1 min-w-0 self-start">
        <h3 :class="(isMobile || isTablet) ? 'text-xs mb-0.5 font-semibold text-gray-100' : 'text-sm mb-1 font-semibold text-gray-100'">
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
      <div v-if="stats && stats.length && statsLayout === 'list'" :class="(isMobile || isTablet) ? 'relative p-2 rounded-lg mb-2' : 'relative p-3 rounded-lg mb-3'" :style="{ background: 'rgba(10, 15, 22, 0.3)' }">
        <div
          v-for="(stat, index) in stats"
          :key="stat.label"
          class="flex items-center justify-between"
          :class="(isMobile || isTablet) ? { 'mt-1.5': index > 0 } : { 'mt-2.5': index > 0 }"
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
      <div v-else-if="stats && stats.length && statsLayout === 'grid'" :class="(isMobile || isTablet) ? 'relative grid grid-cols-2 gap-1.5 mb-2' : 'relative grid grid-cols-2 gap-2.5 mb-3'">
        <div
          v-for="stat in stats"
          :key="stat.label"
          :class="(isMobile || isTablet) ? 'text-center p-2 rounded-lg' : 'text-center p-3 rounded-lg'"
          :style="{ background: 'rgba(10, 15, 22, 0.6)' }"
        >
          <div :class="(isMobile || isTablet) ? 'text-sm font-medium text-gray-100 mb-0.5' : 'text-base font-medium text-gray-100 mb-1'">
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
      <div v-if="$slots.default" :class="(isMobile || isTablet) ? 'relative mb-2' : 'relative mb-3'">
        <slot />
      </div>
    </div>

    <!-- Footer -->
    <div
      v-if="$slots.footer || (actions && actions.length > 0)"
      :class="(isMobile || isTablet) ? 'relative pt-2 mt-2 border-t' : 'relative pt-3 mt-3 border-t'"
      :style="{ borderColor: 'rgba(255, 255, 255, 0.06)' }"
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
    primary: "bg-gradient-to-br from-blue-600 to-purple-600",
    success: "bg-gradient-to-br from-green-600 to-teal-600",
    warning: "bg-gradient-to-br from-amber-600 to-orange-600",
    error: "bg-gradient-to-br from-red-600 to-pink-600",
    neutral: "bg-gradient-to-br from-gray-600 to-gray-700",
  };
  return colorMap[props.iconColor];
});

const iconGradientClass = computed(() => {
  const colorMap = {
    primary: "from-blue-400 to-purple-400",
    success: "from-green-400 to-teal-400",
    warning: "from-amber-400 to-orange-400",
    error: "from-red-400 to-pink-400",
    neutral: "from-gray-400 to-gray-500",
  };
  return colorMap[props.iconColor];
});

const { isMobile, isTablet } = useScreen();
</script>
