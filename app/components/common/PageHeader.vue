<script setup lang="ts">
import type { HeaderAction } from '~/types/ui';

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

const { isDesktop, menuActions, inlineActions, leftActions, rightActions, hasConditionalActions, runAction } = useSubHeaderActionPresentation();
const desktopActions = computed(() => [...leftActions.value, ...rightActions.value]);
const hasLinks = computed(() => isDesktop.value
  ? desktopActions.value.length > 0 || hasConditionalActions.value
  : menuActions.value.length > 0);

const isStatsFocus = computed(() => props.variant === "stats-focus");

function handlePageHeaderActionClick(action: HeaderAction) {
  return runAction(action);
}
</script>

<template>
  <UPageHeader
    :title="title"
    :description="description"
    :ui="{
      root: 'border-0 p-0',
      container: !isDesktop ? `grid items-center ${hasLinks ? 'grid-cols-[minmax(0,1fr)_auto] gap-x-3' : 'grid-cols-1'}` : undefined,
      title: 'col-start-1 row-start-1 min-w-0 flex-1 text-lg leading-6 lg:text-2xl lg:leading-8',
      wrapper: !isDesktop ? 'contents' : undefined,
      description: `mt-1 col-start-1 row-start-2 max-w-3xl line-clamp-2 text-sm leading-5 [overflow-wrap:anywhere] ${resolvedLeadingIcon ? 'pl-9' : ''}`,
      links: !isDesktop ? `col-start-2 row-start-1 self-center shrink-0 ${description ? 'row-span-2' : ''}` : hasConditionalActions ? 'min-h-10' : undefined,
    }"
  >
    <template #title>
      <span class="flex min-w-0 items-start gap-3">
        <UIcon v-if="resolvedLeadingIcon" :name="resolvedLeadingIcon" class="size-6 shrink-0 text-primary lg:mt-1" aria-hidden="true" />
        <span class="min-w-0 flex-1 line-clamp-2 [overflow-wrap:anywhere]" :title="title">{{ title }}</span>
      </span>
    </template>
    <template v-if="hasLinks" #links>
      <LayoutSubHeaderMenu v-if="!isDesktop" />
      <template v-else v-for="action in desktopActions" :key="action.key || action.id">
        <component v-if="action.component" :is="action.component" v-bind="action.props" />
        <UButton
          v-else
          :icon="unref(action.icon)"
          :label="unref(action.label)"
          :variant="unref(action.variant) || 'soft'"
          :color="unref(action.color) || 'neutral'"
          :size="action.size || 'md'"
          loading-auto
          :loading="unref(action.loading)"
          :disabled="unref(action.disabled) || unref(action.loading)"
          :square="isHeaderActionIconOnly(action)"
          :class="getHeaderActionButtonClass(action)"
          :aria-label="action.ariaLabel || unref(action.label) || action.id"
          @click="handlePageHeaderActionClick(action)"
        />
      </template>
    </template>
    <div v-if="!isDesktop && inlineActions.length" class="col-span-full mt-2 flex flex-wrap items-center gap-2">
      <template v-for="action in inlineActions" :key="action.key || action.id">
        <component v-if="action.component" :is="action.component" v-bind="action.props" />
        <UButton
          v-else
          :icon="unref(action.icon)"
          :label="unref(action.label)"
          :variant="unref(action.variant) || 'soft'"
          :color="unref(action.color) || 'neutral'"
          :size="action.size || 'md'"
          loading-auto
          :loading="unref(action.loading)"
          :disabled="unref(action.disabled) || unref(action.loading)"
          :square="isHeaderActionIconOnly(action)"
          :class="getHeaderActionButtonClass(action)"
          :aria-label="action.ariaLabel || unref(action.label) || action.id"
          @click="handlePageHeaderActionClick(action)"
        />
      </template>
    </div>
    <div v-if="stats.length" class="col-span-full mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
      <div v-for="(stat, index) in stats" :key="index" class="eapp-bordered-region p-4">
        <p class="font-semibold text-highlighted" :class="isStatsFocus ? 'text-3xl' : 'text-2xl'">{{ stat.value }}</p>
        <p class="mt-1 text-sm text-muted">{{ stat.label }}</p>
      </div>
    </div>
  </UPageHeader>
</template>
