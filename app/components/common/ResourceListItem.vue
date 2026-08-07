<template>
  <div
    :role="isNavigable ? undefined : clickable && !isLoading ? 'button' : undefined"
    :tabindex="isNavigable ? undefined : clickable && !isLoading ? 0 : undefined"
    :class="[
      'eapp-resource-list-item',
      `eapp-resource-list-item-${size}`,
      active ? 'eapp-resource-list-item-active' : '',
      isSkeletonLoading ? 'eapp-resource-list-item-loading' : '',
      isRefreshing ? 'eapp-resource-list-item-refreshing' : '',
      clickable && !isLoading ? 'cursor-pointer' : 'cursor-default',
      isSkeletonLoading ? 'pointer-events-none cursor-wait' : '',
      itemClass,
    ]"
    :aria-busy="isLoading"
    @click="handleClick"
    @keydown.enter="handleKeyboardClick"
    @keydown.space="handleKeyboardClick"
  >
    <NuxtLink
      v-if="isNavigable && !isLoading"
      :to="to"
      :aria-label="`Open ${title}`"
      class="absolute inset-0 z-0 rounded-[inherit] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--theme-focus-ring-strong)]"
    />

    <span
      v-if="icon || avatar"
      :class="[
        'eapp-resource-list-leading',
        isSkeletonLoading ? 'eapp-surface-muted animate-pulse eapp-resource-list-leading-loading' : avatar ? avatarClass : iconBgClass,
      ]"
    >
      <slot v-if="isSkeletonLoading" name="skeleton-leading" />
      <UIcon v-else :name="normalizedIcon" class="size-4" />
    </span>

    <span class="min-w-0 flex-1 text-left">
      <span v-if="isSkeletonLoading" :class="['block', size === 'sm' ? 'space-y-1.5' : 'space-y-2']">
        <slot name="skeleton-content">
          <span class="flex min-w-0 items-start gap-3">
            <span class="min-w-0 flex-1 space-y-2">
              <span class="block h-4 w-1/3 max-w-72 rounded eapp-surface-muted animate-pulse" />
              <span v-if="description !== undefined" class="block h-3 w-2/3 max-w-[34rem] rounded eapp-surface-muted animate-pulse" />
            </span>
            <span class="hidden h-6 w-16 flex-shrink-0 rounded-[var(--radius-pill)] eapp-surface-muted animate-pulse md:block" />
          </span>
          <span v-if="size !== 'sm' && skeletonStatCount" class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <span
              v-for="index in skeletonStatCount"
              :key="index"
              class="block h-12 rounded-[var(--radius-subcontrol)] eapp-surface-muted animate-pulse"
            />
          </span>
        </slot>
      </span>

      <span v-else class="block min-w-0">
        <span class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <slot name="title">
            <span class="truncate text-sm font-semibold eapp-text-primary">{{ title }}</span>
          </slot>

          <UBadge
            v-if="topBadge"
            :color="topBadge.color || 'info'"
            variant="soft"
            size="xs"
          >
            {{ topBadge.label }}
          </UBadge>
        </span>

        <slot name="description">
          <span v-if="description" class="mt-1 block truncate text-sm eapp-text-tertiary">
            {{ description }}
          </span>
        </slot>

        <slot name="metadata">
          <span v-if="visibleStats.length" class="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
            <span
              v-for="stat in visibleStats"
              :key="stat.label"
              class="eapp-resource-list-stat"
            >
              <span class="eapp-resource-list-stat-label">{{ stat.label }}</span>
              <component
                v-if="stat.component"
                :is="getComponent(stat.component)"
                v-bind="{ ...getDefaultProps(stat.component, 'stats'), ...resolveProps(stat.props) }"
              >
                {{ stat.value }}
              </component>
              <span v-else class="eapp-resource-list-stat-value">{{ stat.value }}</span>
            </span>
          </span>
        </slot>
      </span>
    </span>

    <slot
      v-if="isSkeletonLoading && (headerActions?.length || normalizedActions.length)"
      name="skeleton-actions"
    >
      <span class="hidden h-8 w-20 flex-shrink-0 rounded-[var(--radius-control)] skeleton-inline skeleton-pulse-slow md:block" />
    </slot>

    <span
      v-else-if="headerActions?.length"
      class="relative z-10 eapp-resource-list-header-actions"
    >
      <component
        v-for="(action, index) in headerActions"
        :key="index"
        :is="getComponent(action.component)"
        v-bind="{ ...getDefaultProps(action.component, 'header'), ...resolveProps(action.props) }"
        @click="handleHeaderActionClick(action, $event)"
        @update:model-value="action.onUpdate"
      >
        <template v-if="action.label">{{ action.label }}</template>
      </component>
    </span>

    <span
      v-if="!isSkeletonLoading && normalizedActions.length"
      class="relative z-10 eapp-resource-list-actions"
    >
      <UButton
        v-for="action in normalizedActions"
        :key="action.label"
        v-bind="resolveProps(action.props)"
        :to="action.to"
        :loading="action.loading"
        :disabled="action.disabled || action.loading"
        @click="handleActionClick(action, $event)"
      >
        <span class="hidden sm:inline">{{ action.label }}</span>
      </UButton>
    </span>
  </div>
</template>

<script setup lang="ts">
import { UAvatar, UBadge, UButton, UChip, UIcon, UKbd, USwitch, UTooltip, MethodBadge } from "#components";
import type { ResourceListAction, ResourceListHeaderAction, ResourceListLink, ResourceListSize, ResourceListStat, ResourceListTopBadge } from "~/types/resource-list";

const props = withDefaults(defineProps<{
  title: string;
  description?: string;
  icon?: string;
  avatar?: string;
  avatarClass?: string;
  iconColor?: "primary" | "success" | "warning" | "error" | "neutral" | "info";
  stats?: ResourceListStat[];
  actions?: ResourceListAction[];
  methods?: ResourceListAction[];
  headerActions?: ResourceListHeaderAction[];
  topBadge?: ResourceListTopBadge;
  active?: boolean;
  clickable?: boolean;
  to?: ResourceListLink["to"];
  itemClass?: string;
  loading?: boolean;
  size?: ResourceListSize;
  onClick?: () => void;
}>(), {
  description: undefined,
  icon: undefined,
  avatar: undefined,
  avatarClass: "",
  iconColor: "primary",
  stats: undefined,
  actions: undefined,
  methods: undefined,
  headerActions: undefined,
  topBadge: undefined,
  active: false,
  clickable: true,
  to: undefined,
  itemClass: "",
  loading: false,
  size: "md",
  onClick: undefined,
});

const emit = defineEmits<{
  click: [event: Event];
}>();

const isLoading = computed(() => props.loading);
const hasContent = computed(() => Boolean(props.title || props.description || props.stats?.length));
const isSkeletonLoading = computed(() => isLoading.value && !hasContent.value);
const isRefreshing = computed(() => isLoading.value && hasContent.value);
const isNavigable = computed(() => Boolean(props.to));

const componentMap = {
  UAvatar,
  UBadge,
  UButton,
  UChip,
  UIcon,
  UKbd,
  USwitch,
  UTooltip,
  MethodBadge,
};

const getComponent = (componentName?: string | any) => {
  if (!componentName) return UButton;
  if (typeof componentName !== "string") return componentName;
  return componentMap[componentName as keyof typeof componentMap] || UButton;
};

const getDefaultProps = (componentName?: string | any, context: "header" | "stats" = "header") => {
  const defaults = {
    header: {
      UButton: { size: "sm", variant: "ghost", color: "neutral" },
      UBadge: { size: "sm" },
      UAvatar: { size: "xs" },
      USwitch: { size: "md" },
      UChip: { size: "md" },
      UIcon: { size: "4" },
    },
    stats: {
      UBadge: { size: "xs", variant: "soft" },
      UChip: { size: "md", variant: "soft" },
      UButton: { size: "xs", variant: "ghost" },
      UIcon: { size: "4" },
      UKbd: { size: "xs" },
      MethodBadge: { size: "xs" },
    },
  };

  if (!componentName || typeof componentName !== "string") return {};
  return defaults[context]?.[componentName as keyof typeof defaults[typeof context]] || {};
};

function resolveProps(input?: Record<string, any>) {
  if (!input) return {};

  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, unref(value)]),
  );
}

const normalizedIcon = computed(() => (props.avatar || props.icon || "lucide:circle").replace(/\s+/g, ""));

const iconBgClass = computed(() => {
  const colorMap = {
    primary: "eapp-primary-soft",
    success: "eapp-status-success-soft",
    warning: "eapp-status-warning-soft",
    error: "eapp-status-danger-soft",
    neutral: "eapp-status-neutral-soft",
    info: "eapp-status-info-soft",
  };
  return colorMap[props.iconColor];
});

const visibleStats = computed(() =>
  (props.stats || []).filter((stat) => stat.value !== undefined && stat.value !== null && stat.value !== ""),
);

const skeletonStatCount = computed(() => props.stats === undefined ? 4 : visibleStats.value.length);

const normalizedActions = computed(() => props.actions || props.methods || []);

function handleClick(event: MouseEvent) {
  if (isNavigable.value || !props.clickable || isLoading.value) return;
  props.onClick?.();
  emit("click", event);
}

function handleKeyboardClick(event: KeyboardEvent) {
  if (isNavigable.value || !props.clickable || isLoading.value) return;
  event.preventDefault();
  props.onClick?.();
  emit("click", event);
}

function handleHeaderActionClick(action: ResourceListHeaderAction, event: Event) {
  event.stopPropagation();
  action.onClick?.(event);
}

function handleActionClick(action: ResourceListAction, event: Event) {
  event.stopPropagation();
  action.onClick?.(event);
}
</script>
