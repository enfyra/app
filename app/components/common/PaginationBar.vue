<script setup lang="ts">
type PaginationColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral';

defineOptions({ inheritAttrs: false });

const page = defineModel<number>('page', { required: true });

const props = withDefaults(defineProps<{
  total: number;
  itemsPerPage: number;
  loading?: boolean;
  showRange?: boolean;
  showEdges?: boolean;
  siblingCount?: number;
  align?: 'between' | 'center';
  color?: PaginationColor;
  activeColor?: PaginationColor;
  activeVariant?: 'solid' | 'outline' | 'soft' | 'subtle' | 'ghost' | 'link';
  to?: (page: number) => any;
  ui?: Record<string, string>;
}>(), {
  loading: false,
  showRange: true,
  showEdges: true,
  siblingCount: 1,
  align: 'between',
  color: 'primary',
  activeColor: 'primary',
  activeVariant: 'soft',
});

const mainBar = ref<HTMLElement | null>(null);
const { isMiniVisible } = useMiniBarVisibility(mainBar);

// The mini bar is the only pagination on screen once the main bar scrolls away, so
// on desktop it stands in at the main bar's own scale instead of staying phone-sized.
const { isMobile } = useScreen();
const miniSize = computed(() => (isMobile.value ? 'xs' : 'sm'));

// Loading is reported by the chip only, and deferred so a quick fetch shows no
// chip instead of blinking one.
const { active: showLoadingChip } = useDeferredBusy(() => props.loading);

// Neither pagination takes a `disabled` binding. reka-ui derives the prev/next
// disabled state from `page === 1` / `page === pageCount` OR the root `disabled`
// prop, so wiring `loading` there made prev flip enabled -> disabled -> enabled on
// every page change. `useApi` already aborts the in-flight request when a new one
// starts and never commits an aborted response, so overlapping page changes are
// safe without disabling the controls.

const pageStart = computed(() => {
  if (props.total <= 0) return 0;
  return ((page.value || 1) - 1) * props.itemsPerPage + 1;
});

const pageEnd = computed(() => Math.min((page.value || 1) * props.itemsPerPage, props.total));
const hasPagination = computed(() => props.total > props.itemsPerPage);
const showMini = computed(() => hasPagination.value && isMiniVisible.value);

// The main bar keeps one row at every width so its height is stable. Seven controls
// do not fit a phone, and UPagination exposes no prop that hides only the
// jump-to-ends controls (`showControls` takes prev/next with them), so those two are
// hidden by class below `md`.
const EDGE_CONTROL_UI = {
  first: 'max-md:!hidden',
  last: 'max-md:!hidden',
};

const mainRootClass = computed(() =>
  props.align === 'center'
    ? 'flex flex-row items-center justify-center gap-2'
    : 'flex flex-row items-center justify-between gap-2',
);

const mainUi = computed(() => ({
  ...props.ui,
  ...EDGE_CONTROL_UI,
}));

const miniUi = computed(() => ({
  root: '!w-auto',
  list: 'flex-nowrap gap-0.5 md:gap-1',
  item: '!min-w-7 md:!min-w-8',
  ...props.ui,
  ...EDGE_CONTROL_UI,
}));
</script>

<template>
  <div
    v-if="hasPagination"
    ref="mainBar"
    v-bind="$attrs"
    :class="[
      'eapp-pagination',
      '-mx-4 px-4 sm:-mx-6 sm:px-6',
      'border-t border-[color-mix(in_srgb,var(--shell-main-border)_60%,transparent)] bg-[var(--shell-main-bg)] py-3',
      mainRootClass,
    ]"
  >
    <div class="flex min-w-0 items-center gap-2">
      <UPagination
        v-model:page="page"
        size="sm"
        :items-per-page="itemsPerPage"
        :total="total"
        :show-edges="showEdges"
        :sibling-count="siblingCount"
        :to="to"
        :color="color"
        :active-color="activeColor"
        :active-variant="activeVariant"
        :ui="mainUi"
      />
      <div
        v-if="showLoadingChip"
        class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-default)] px-2.5 py-1 text-xs text-[var(--text-tertiary)] shadow-sm"
      >
        <UIcon name="lucide:loader-circle" class="h-3.5 w-3.5 animate-spin text-primary-500" />
        <span class="hidden sm:inline">Loading</span>
      </div>
    </div>

    <p v-if="showRange" class="shrink-0 whitespace-nowrap text-xs tabular-nums text-[var(--text-tertiary)]">
      <span class="sr-only">Showing {{ pageStart }} to {{ pageEnd }} of {{ total }} results</span>
      <span aria-hidden="true">
        <span class="text-[var(--text-secondary)]">{{ pageStart }}-{{ pageEnd }}</span>
        <span class="px-1 text-[var(--text-quaternary)]">/</span>{{ total }}
      </span>
    </p>
  </div>

  <Teleport to="body">
    <Transition name="mini-pagination">
      <div
        v-show="showMini"
        class="eapp-pagination eapp-pagination-mini fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-[var(--radius-panel)] px-3 py-1.5 md:max-w-lg md:gap-4 md:px-4 md:py-2.5"
      >
        <UPagination
          v-model:page="page"
          :size="miniSize"
          :items-per-page="itemsPerPage"
          :total="total"
          :show-edges="showEdges"
          :sibling-count="siblingCount"
          :to="to"
          :color="color"
          :active-color="activeColor"
          :active-variant="activeVariant"
          :ui="miniUi"
        />

        <p v-if="showRange" class="shrink-0 whitespace-nowrap text-xs tabular-nums text-[var(--text-tertiary)] md:text-sm">
          <span class="sr-only">Showing {{ pageStart }} to {{ pageEnd }} of {{ total }} results</span>
          <span aria-hidden="true">
            <span class="text-[var(--text-secondary)]">{{ pageStart }}-{{ pageEnd }}</span>
            <span class="px-1 text-[var(--text-quaternary)]">/</span>{{ total }}
          </span>
        </p>
      </div>
    </Transition>
  </Teleport>
</template>
