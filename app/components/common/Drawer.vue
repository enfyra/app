<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    direction?: 'left' | 'right';
    class?: string;
    handle?: boolean;
    handleOnly?: boolean;
    fullWidth?: boolean;
    showClose?: boolean;
    zIndex?: number;
    nested?: boolean;
  }>(),
  {
    direction: 'right',
    handle: false,
    handleOnly: false,
    fullWidth: false,
    showClose: true,
    zIndex: 1000,
    nested: false,
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const slots = useSlots();
const hasHeader = computed(() => !!slots.header);
const hasFooter = computed(() => !!slots.footer);
const hasContent = computed(() => hasHeader.value || !!slots.body || hasFooter.value);

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
  <UDrawer
    v-if="hasContent"
    :handle="false"
    handle-only
    v-model:open="isOpen"
    :direction="props.direction"
    :inset="true"
    :nested="props.nested"
    :style="props.zIndex ? { zIndex: props.zIndex } : undefined"
    :ui="{
      container: 'h-[100dvh]',
      content: `overflow-hidden bg-[var(--surface-default)] ${props.fullWidth ? 'w-full' : '!w-[36rem] !max-w-[calc(100%-2rem)]'}`,
      header: 'pt-0 pb-2 flex items-center justify-between flex-shrink-0',
      body: 'flex-1 overflow-y-auto min-h-0 custom-scrollbar',
      footer: 'mb-2 md:mb-4',
    }"
  >
    <template #header>
      <div v-if="hasHeader" class="flex items-center justify-between w-full ">
        <div class="flex-1 min-w-0">
          <slot name="header" />
        </div>
        <UButton
          icon="lucide:x"
          color="error"
          variant="soft"
          :size="(isMobile || isTablet) ? 'lg' : 'xl'"
          :class="(isMobile || isTablet) ? 'rounded-full !aspect-square flex-shrink-0' : 'flex-shrink-0'"
          @click="close"
        />
      </div>
    </template>

    <template #body>
      <slot name="body" />
    </template>

    <template #footer>
      <slot v-if="hasFooter" name="footer" />
    </template>
  </UDrawer>
</template>

