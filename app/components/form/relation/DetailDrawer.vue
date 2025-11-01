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

const { isMobile, isTablet } = useScreen();
</script>

<template>
  <Teleport to="body">
    <UDrawer
      :handle="false"
      handle-only
      v-model:open="open"
      direction="right"
      :class="(isMobile || isTablet) ? 'w-full max-w-full' : 'min-w-xl max-w-xl'"
      :ui="{
        header:
          'border-b border-muted text-muted pb-2 flex items-center justify-between',
      }"
    >
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h2 :class="(isMobile || isTablet) ? 'text-base font-semibold truncate' : 'text-lg font-semibold'">Record Details</h2>
          <UButton
            icon="lucide:x"
            variant="soft"
            color="error"
            @click="open = false"
            :size="(isMobile || isTablet) ? 'sm' : 'md'"
            :class="(isMobile || isTablet) ? 'rounded-full !aspect-square flex-shrink-0' : ''"
          />
        </div>
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
