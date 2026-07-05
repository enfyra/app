<script setup lang="ts">
type PaginationColor = "primary" | "secondary" | "success" | "info" | "warning" | "error" | "neutral";

const page = defineModel<number>("page", { default: 1 });

const props = withDefaults(defineProps<{
  loading: boolean;
  hasItems: boolean;
  rootClass?: string;
  listClass?: string;
  loadingTitle?: string;
  loadingDescription?: string;
  loadingSize?: "sm" | "md" | "lg";
  loadingType?: "dots" | "spinner" | "skeleton" | "table" | "form" | "card" | "folder" | "file-card" | "menu" | "resource-list";
  loadingContext?: "page" | "modal" | "inline" | "button";
  skeletonRows?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: string;
  emptySize?: "sm" | "md" | "lg";
  total?: number;
  itemsPerPage?: number;
  paginationClass?: string;
  paginationAlign?: "between" | "center";
  paginationLoading?: boolean;
  paginationShowRange?: boolean;
  paginationColor?: PaginationColor;
  paginationActiveColor?: PaginationColor;
  paginationUi?: Record<string, string>;
  to?: (page: number) => any;
}>(), {
  rootClass: "space-y-6",
  listClass: "",
  loadingTitle: "Loading...",
  loadingDescription: undefined,
  loadingSize: "sm",
  loadingType: "resource-list",
  loadingContext: "page",
  skeletonRows: 9,
  emptyTitle: "No items found",
  emptyDescription: undefined,
  emptyIcon: "lucide:inbox",
  emptySize: "sm",
  total: 0,
  itemsPerPage: 0,
  paginationClass: "mt-6",
  paginationAlign: "between",
  paginationLoading: false,
  paginationShowRange: true,
  paginationColor: "primary",
  paginationActiveColor: "primary",
  paginationUi: undefined,
  to: undefined,
});

const showPagination = computed(() =>
  props.hasItems
  && props.total > 0
  && props.itemsPerPage > 0
  && props.total > props.itemsPerPage
  && page.value !== undefined,
);

const showResourceListSkeleton = computed(() => props.loadingType === "resource-list");
const fallbackLoadingType = computed(() => props.loadingType === "resource-list" ? "card" : props.loadingType);
</script>

<template>
  <div :class="rootClass">
    <Transition name="loading-fade" mode="out-in">
      <div v-if="loading" key="loading">
        <slot name="loading">
          <div v-if="showResourceListSkeleton" class="eapp-resource-list">
            <div
              v-for="row in skeletonRows"
              :key="row"
              class="eapp-resource-list-item pointer-events-none"
            >
              <span class="eapp-resource-list-leading skeleton-gradient skeleton-pulse-slow" />
              <span class="min-w-0 flex-1 space-y-2">
                <span class="block h-4 w-1/3 max-w-72 rounded skeleton-gradient skeleton-pulse-slow" />
                <span class="block h-3 w-2/3 max-w-[34rem] rounded skeleton-inline skeleton-pulse-slow" />
                <span class="flex gap-2">
                  <span class="block h-5 w-16 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow" />
                  <span class="block h-5 w-20 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow" />
                  <span class="hidden h-5 w-24 rounded-[var(--radius-pill)] skeleton-inline skeleton-pulse-slow sm:block" />
                </span>
              </span>
              <span class="hidden h-8 w-20 rounded-[var(--radius-control)] skeleton-inline skeleton-pulse-slow md:block" />
            </div>
          </div>
          <CommonLoadingState
            v-else
            :title="loadingTitle"
            :description="loadingDescription"
            :size="loadingSize"
            :type="fallbackLoadingType"
            :context="loadingContext"
          />
        </slot>
      </div>

      <div v-else-if="hasItems" key="list">
        <div :class="['eapp-resource-list', listClass]">
          <slot />
        </div>

        <CommonPaginationBar
          v-if="showPagination"
          v-model:page="page"
          :class="paginationClass"
          :items-per-page="itemsPerPage"
          :total="total"
          :loading="paginationLoading"
          :show-range="paginationShowRange"
          :align="paginationAlign"
          :color="paginationColor"
          :active-color="paginationActiveColor"
          :to="to"
          :ui="paginationUi"
        />
      </div>

      <div v-else key="empty">
        <slot name="empty">
          <CommonEmptyState
            :title="emptyTitle"
            :description="emptyDescription"
            :icon="emptyIcon"
            :size="emptySize"
          />
        </slot>
      </div>
    </Transition>
  </div>
</template>
