<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open?: boolean;
    class?: string;
    handle?: boolean;
    preventClose?: boolean;
    ui?: Record<string, string>;
  }>(),
  {
    open: false,
    handle: false,
    preventClose: false,
  }
);

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const slots = useSlots();
const hasTitle = computed(() => !!slots.header);
const hasFooter = computed(() => !!slots.footer);
const hasBody = computed(() => !!slots.body || !!slots.default);
const hasContent = computed(() => hasTitle.value || hasBody.value || hasFooter.value);

const isOpen = computed({
  get: () => props.open,
  set: (value) => {
    if (!value && props.preventClose) {
      return;
    }
    emit('update:open', value);
  },
});

const { isMobile, isTablet } = useScreen();

const mergedUi = computed(() => ({
  content: 'surface-card',
  header: 'pb-0',
  body: 'pt-4',
  ...props.ui,
}));

</script>

<template>
    <UModal
      v-if="hasContent"
      v-model:open="isOpen"
      :handle="props.handle"
      :class="props.class"
      :ui="mergedUi"
      :close="{
        color: 'error',
        variant: 'soft',
        size: (isMobile || isTablet) ? 'lg' : 'xl',
      }"
    >
      <template #title>
        <div v-if="hasTitle" class="flex items-center justify-between w-full" @click.stop>
          <div class="flex-1 min-w-0">
            <slot name="header" />
          </div>
        </div>
      </template>

      <template #description>
        <span class="sr-only">{{ hasTitle ? 'Modal dialog' : 'Dialog' }}</span>
      </template>

      <template #body>
        <div @click.stop>
          <slot v-if="$slots.body" name="body" />
          <slot v-else />
        </div>
      </template>

      <template #footer>
        <div v-if="hasFooter" class="w-full" @click.stop>
          <slot name="footer" />
        </div>
      </template>
    </UModal>
</template>
