<template>
  <div
    class="relative group transition-all duration-300 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 h-full flex flex-col overflow-hidden shadow-lg lg:hover:shadow-2xl lg:hover:border-primary-300 dark:lg:hover:border-primary-600"
    :class="cardClass"
  >
    <!-- Header -->
    <div
      class="px-5 py-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700"
    >
      <div class="flex items-center gap-3">
        <!-- Icon -->
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
          :class="iconBgClass"
        >
          <UIcon :name="icon" class="w-5 h-5" :class="iconClass" />
        </div>

        <!-- Title & Description -->
        <div class="flex-1 min-w-0">
          <div
            class="font-semibold text-gray-900 dark:text-gray-100 truncate"
            :title="title"
          >
            {{ title }}
          </div>
          <div
            v-if="description"
            class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5"
            :title="description"
          >
            {{ description }}
          </div>
        </div>

        <!-- Card Header Actions -->
        <div
          v-if="headerActions && headerActions.length > 0"
          class="flex items-center gap-2"
        >
          <component
            v-for="(action, index) in headerActions"
            :key="index"
            :is="getComponent(action.component)"
            v-bind="{ ...getDefaultProps(action.component, 'header'), ...(action.props || {}) }"
            @click="action.onClick"
            @update:model-value="action.onUpdate"
          >
            <template v-if="action.label">{{ action.label }}</template>
          </component>
        </div>
      </div>
    </div>

    <!-- Body Content - This will grow -->
    <div class="flex-1 px-5 py-4 space-y-3">
      <!-- Custom body content -->
      <slot />

      <!-- Stats -->
      <div v-if="stats && stats.length" class="space-y-2">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0"
        >
          <span
            class="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider"
            >{{ stat.label }}</span
          >
          <span class="text-gray-900 dark:text-gray-100 font-medium">
            <div v-if="stat.values && stat.values.length > 0" class="flex gap-1 flex-wrap">
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
          </span>
        </div>
      </div>
    </div>

    <!-- Footer - Always at bottom -->
    <div
      v-if="$slots.footer || (actions && actions.length > 0)"
      class="px-5 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 mt-auto"
    >
      <!-- Custom footer content -->
      <slot name="footer" />

      <!-- Action Buttons -->
      <div v-if="actions && actions.length" class="flex gap-2">
        <UButton
          v-for="action in actions"
          :key="action.label"
          v-bind="action.props"
          :to="action.to"
          :loading="action.loading"
          :disabled="action.disabled"
          @click="action.onClick"
          :class="[
            action.block ? 'flex-1' : '',
            action.onClick || action.to ? 'cursor-pointer' : '',
          ]"
        >
          {{ action.label }}
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { UAvatar, UBadge, UButton, USwitch, UChip, UIcon, UKbd, UTooltip } from "#components";

// Component interfaces
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
  actions?: Action[];
  headerActions?: HeaderAction[];
  cardClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  iconColor: "primary",
  cardClass: "",
});

// Component mapping for dynamic component resolution
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

// Default props for components based on context
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

// Computed styles based on icon color
const iconBgClass = computed(() => {
  const colorMap = {
    primary: "bg-primary/10 dark:bg-primary/20",
    success: "bg-green-100 dark:bg-green-900/30",
    warning: "bg-amber-100 dark:bg-amber-900/30",
    error: "bg-red-100 dark:bg-red-900/30",
    neutral: "bg-gray-100 dark:bg-gray-800",
  };
  return colorMap[props.iconColor];
});

const iconClass = computed(() => {
  const colorMap = {
    primary: "text-primary-600 dark:text-primary-400",
    success: "text-green-600 dark:text-green-400",
    warning: "text-amber-600 dark:text-amber-400",
    error: "text-red-600 dark:text-red-400",
    neutral: "text-gray-600 dark:text-gray-400",
  };
  return colorMap[props.iconColor];
});
</script>
