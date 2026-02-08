<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    direction?: 'left' | 'right';
    class?: string;
    handle?: boolean;
    handleOnly?: boolean;
  }>(),
  {
    direction: 'right',
    handle: false,
    handleOnly: false,
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

const drawerClass = computed(() => {
  const baseClass = props.class || '';
  const responsiveClass = (isMobile.value || isTablet.value) 
    ? 'w-full max-w-full' 
    : props.direction === 'right' 
      ? 'min-w-xl max-w-xl' 
      : 'min-w-xl max-w-xl';
  return `${responsiveClass} ${baseClass}`.trim();
});

function close() {
  isOpen.value = false;
}
</script>

<template>
  <Teleport to="body">
    <UDrawer
      v-if="hasContent"
      :handle="false"
      handle-only
      v-model:open="isOpen"
      :direction="props.direction"
      :class="drawerClass"
      :ui="{
        container: 'h-[100dvh]',
        content: 'overflow-hidden bg-white dark:bg-gray-900 text-gray-900 dark:text-white',
        header: 'border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between flex-shrink-0 text-gray-900 dark:text-white',
        body: 'flex-1 overflow-y-auto min-h-0 px-6 custom-scrollbar text-gray-900 dark:text-white',
        footer: 'flex-shrink-0 border-t border-gray-200 dark:border-gray-800 px-6 py-4 text-gray-900 dark:text-white',
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
  </Teleport>
</template>

