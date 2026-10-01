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
const hasConditionalActions = computed(() => subHeaderActions.value.some(action => action?.show !== undefined));

const isStatsFocus = computed(() => props.variant === "stats-focus");

function handlePageHeaderActionClick(action: any) {
  return action.onClick?.();
}
</script>

<template>
  <UPageHeader
    :title="title"
    :description="description"
    :ui="{
      root: 'px-4 py-4 sm:px-6',
      title: 'text-xl sm:text-2xl',
      description: `mt-1 max-w-3xl text-sm leading-5 ${resolvedLeadingIcon ? 'pl-9' : ''}`,
      links: hasConditionalActions ? 'min-h-10' : undefined,
    }"
  >
    <template #title>
      <span class="flex min-w-0 items-center gap-3">
        <UIcon v-if="resolvedLeadingIcon" :name="resolvedLeadingIcon" class="size-6 shrink-0 text-primary" aria-hidden="true" />
        <span class="min-w-0 break-words">{{ title }}</span>
      </span>
    </template>
    <template v-if="hasActions || hasConditionalActions" #links>
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
    </template>
    <div v-if="stats.length" class="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
      <div v-for="(stat, index) in stats" :key="index" class="eapp-bordered-region p-4">
        <p class="font-semibold text-highlighted" :class="isStatsFocus ? 'text-3xl' : 'text-2xl'">{{ stat.value }}</p>
        <p class="mt-1 text-sm text-muted">{{ stat.label }}</p>
      </div>
    </div>
  </UPageHeader>
</template>
