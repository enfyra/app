<script setup lang="ts">
import { useModel } from "#imports";

const props = withDefaults(
  defineProps<{
    modelValue: any;
    new?: boolean;
  }>(),
  {
    new: false,
  }
);

const emit = defineEmits(["save"]);
const table = useModel(props, "modelValue");
</script>

<template>
  <div class="space-y-6">
    <!-- Table Name slot for create new -->
    <slot name="tableName" />
    
    <!-- Table Description -->
    <div class="mb-6">
      <UTextarea
        v-model="table.description"
        placeholder="Describe this table"
        autoresize
        variant="outline"
        class="text-sm w-full"
      />
    </div>
    
    <!-- Table Content -->
    <slot />
  </div>
</template>
