<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    class?: string;
    handle?: boolean;
    preventClose?: boolean;
  }>(),
  {
    handle: false,
    preventClose: false,
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const slots = useSlots();
const hasTitle = computed(() => !!slots.title);
const hasFooter = computed(() => !!slots.footer);
const hasContent = computed(() => hasTitle.value || !!slots.body || hasFooter.value);

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (!value && props.preventClose) {
      return;
    }
    emit('update:modelValue', value);
  },
});

const { isMobile, isTablet } = useScreen();

function close() {
  isOpen.value = false;
}
</script>

<template>
  <Teleport to="body">
    <UModal
      v-if="hasContent"
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
        <div v-if="hasTitle" class="flex items-center justify-between w-full">
          <div class="flex-1 min-w-0">
            <slot name="title" />
          </div>
        </div>
      </template>

      <template #body>
        <slot name="body" />
      </template>

      <template #footer>
        <slot v-if="hasFooter" name="footer" />
      </template>
    </UModal>
  </Teleport>
</template>

