<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui';

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<{
  modelValue?: string | number;
  items?: TabsItem[];
  unmountOnHide?: boolean;
  bodyClass?: string;
  framed?: boolean;
}>(), { unmountOnHide: false, items: () => [], framed: true });
const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>();
const slots = useSlots();
const tabHeaderUi = { list: 'border-b-0 mb-0 shadow-none', indicator: '!bottom-0' };
const panelUi = computed(() => ({
  root: props.framed
    ? 'eapp-tabbed-panel flex min-w-0 min-h-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-default bg-default ring-0 divide-y-0 shadow-none'
    : 'eapp-tabbed-panel flex min-w-0 min-h-0 flex-col rounded-none border-0 bg-transparent ring-0 divide-y-0 shadow-none',
  header: props.framed
    ? 'bg-muted px-3 sm:px-3 md:px-5 py-0 shadow-[inset_0_-1px_0_var(--ui-border)]'
    : 'bg-transparent p-0 sm:p-0 shadow-none',
  body: props.bodyClass || (!props.framed ? 'p-0 sm:p-0 pt-4 sm:pt-4 md:pt-5 space-y-4 md:space-y-6' : slots.header ? 'p-3 sm:p-3 md:p-5 space-y-4 md:space-y-6' : 'p-0 sm:p-0'),
}));
</script>

<template>
  <UCard v-bind="$attrs" :ui="panelUi">
    <template v-if="slots.header" #header>
      <UTheme :ui="{ tabs: tabHeaderUi }"><slot name="header" /></UTheme>
    </template>
    <slot v-if="slots.header" />
    <UTabs
      v-else
      :model-value="props.modelValue"
      :items="props.items"
      :unmount-on-hide="props.unmountOnHide"
      variant="link"
      :ui="{
        root: 'gap-0',
        list: 'min-w-0 overflow-x-auto overflow-y-hidden border-b-0 bg-muted px-3 md:px-5 shadow-[inset_0_-1px_0_var(--ui-border)]',
        indicator: '!bottom-0',
        content: 'mt-0 p-3 md:p-5 space-y-4 md:space-y-6',
      }"
      @update:model-value="value => emit('update:modelValue', value)"
    >
      <template v-for="(_, name) in slots" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps" />
      </template>
    </UTabs>
  </UCard>
</template>
