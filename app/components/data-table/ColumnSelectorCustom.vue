<template>
  <UPopover>
    <UButton icon="i-lucide-columns" :size="size" :variant="variant">
      Columns
    </UButton>

    <template #panel>
      <div class="p-2 min-w-[200px]">
        <div
          v-for="item in items"
          :key="item.label"
          class="flex items-center gap-2 px-3 py-2 lg:hover:bg-gray-100 rounded cursor-pointer"
          @click="item.onSelect"
        >
          <UCheckbox :checked="item.checked" @change="item.onSelect" />
          <span class="text-sm">{{ item.label }}</span>
        </div>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import type { ColumnSelectorProps } from "../../utils/types";

interface Props extends ColumnSelectorProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "solid" | "outline" | "ghost" | "soft";
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  variant: "soft",
});
</script>
