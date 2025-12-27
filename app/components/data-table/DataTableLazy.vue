<script setup lang="ts">
import type { DataTableProps } from "../../utils/types";

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(defineProps<DataTableProps>(), {
  skeletonRows: 5,
});

defineEmits<{
  "row-click": [row: any];
  "selection-change": [selectedRows: any[]];
}>();

const DataTable = defineAsyncComponent(() => import("./DataTable.vue"));
</script>

<template>
  <div>
    <Suspense>
      <DataTable
        :data="props.data"
        :columns="props.columns"
        :page-size="props.pageSize"
        :loading="props.loading"
        :selectable="props.selectable"
        :selected-items="props.selectedItems"
        :context-menu-items="props.contextMenuItems"
        :skeleton-rows="props.skeletonRows"
        @row-click="(row) => $emit('row-click', row)"
        @selection-change="
          (selectedRows) => $emit('selection-change', selectedRows)
        "
      />
    </Suspense>
  </div>
</template>
