<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    class?: string;
    handle?: boolean;
  }>(),
  {
    handle: false,
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const { isMobile, isTablet } = useScreen();

function close() {
  isOpen.value = false;
}
</script>

<template>
  <Teleport to="body">
    <UModal
      v-model:open="isOpen"
      :handle="props.handle"
      :class="props.class"
      :close="{
        color: 'error',
        variant: 'solid',
        size: (isMobile || isTablet) ? 'lg' : 'xl',
      }"
    >
      <template #title>
        <div class="flex items-center justify-between w-full">
          <div class="flex-1 min-w-0">
            <slot name="title" />
          </div>
        </div>
      </template>

      <template #body>
        <slot name="body" />
      </template>

      <template #footer>
        <slot name="footer" />
      </template>
    </UModal>
  </Teleport>
</template>

