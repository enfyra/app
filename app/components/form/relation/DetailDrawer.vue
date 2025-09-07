<script setup lang="ts">
// Vue functions are auto-imported

const props = defineProps<{
  modelValue: boolean;
  record: Record<string, any>;
  tableName: string;
}>();

const emit = defineEmits(["update:modelValue"]);

const open = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const { isTablet } = useScreen();
</script>

<template>
  <Teleport to="body">
    <UDrawer
      v-model:open="open"
      direction="right"
      :class="isTablet ? 'w-full' : 'min-w-xl'"
      :ui="{
        header:
          'border-b border-muted text-muted pb-2 flex items-center justify-between',
      }"
    >
      <template #header>
        <h2>Record Details</h2>
        <UButton
          icon="lucide:x"
          variant="ghost"
          color="error"
          @click="open = false"
        />
      </template>

      <template #body>
        <RecordDetailsViewer
          :record="props.record"
          :table-name="props.tableName"
        />
      </template>
    </UDrawer>
  </Teleport>
</template>
