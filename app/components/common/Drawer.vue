<script setup lang="ts">
import { unref } from 'vue';
import { DrawerTitle } from 'vaul-vue';
import type { DialogFooterAction } from '~/types/ui';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    direction?: 'left' | 'right' | 'bottom';
    title?: string;
    class?: string;
    handle?: boolean;
    handleOnly?: boolean;
    fullWidth?: boolean;
    showClose?: boolean;
    nested?: boolean;
    cancelAction?: DialogFooterAction | false;
    primaryAction?: DialogFooterAction | false;
    dangerAction?: DialogFooterAction | false;
    leadingActions?: DialogFooterAction[];
    footerHint?: string | false;
  }>(),
  {
    direction: 'right',
    handle: false,
    handleOnly: false,
    fullWidth: false,
    showClose: true,
    nested: false,
    cancelAction: false,
    primaryAction: false,
    dangerAction: false,
    leadingActions: () => [],
    footerHint: false,
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const slots = useSlots();
const hasHeader = computed(() => !!slots.header);
const hasManagedFooter = computed(() => Boolean(props.cancelAction || props.primaryAction || props.dangerAction || props.leadingActions.length || props.footerHint));
const hasFooter = computed(() => !!slots.footer || hasManagedFooter.value);
const hasContent = computed(() => hasHeader.value || !!slots.body || hasFooter.value);

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const { lock, unlock } = useOverlayScrollLock();

watch(
  () => isOpen.value && hasContent.value,
  (open) => open ? lock() : unlock(),
  { immediate: true, flush: 'sync' },
);

function close() {
  isOpen.value = false;
}

function runAction(action: DialogFooterAction | false | undefined, fallbackClose = false) {
  if (!action) return;
  if (action.onClick) {
    return action.onClick();
  } else if (action.closeOnClick === true || fallbackClose) {
    close();
  }
}

function actionColor(action: DialogFooterAction, fallback: 'primary' | 'secondary' | 'warning' | 'error' | 'neutral') {
  if (action.tone === 'danger') return 'error';
  return action.tone || fallback;
}

function actionVariant(action: DialogFooterAction, fallback: 'solid' | 'outline' | 'ghost' | 'soft') {
  return action.variant || fallback;
}

function actionButtonProps(action: DialogFooterAction) {
  const loading = unref(action.loading);
  const disabled = unref(action.disabled);
  return {
    ...(action.icon === undefined ? {} : { icon: action.icon }),
    ...(loading === undefined ? {} : { loading }),
    ...(disabled === undefined ? {} : { disabled }),
    ...(action.form === undefined ? {} : { form: action.form }),
  };
}
</script>

<template>
  <UDrawer
    v-if="hasContent"
    v-model:open="isOpen"
    :handle="props.handle"
    :handle-only="true"
    :direction="props.direction"
    v-bind="props.title === undefined ? {} : { title: props.title }"
    :inset="true"
    :nested="props.nested"
    :ui="{
      container: props.direction === 'bottom' ? '!h-auto max-h-[85dvh] !gap-0 !p-3 !pb-[max(0.75rem,env(safe-area-inset-bottom))]' : 'h-full min-h-0 p-3 md:p-4',
      content: `overflow-hidden bg-[var(--surface-default)] ${props.direction === 'bottom' ? '' : props.fullWidth ? 'w-[calc(100%-2*var(--shell-overlay-inset))]' : '!w-[36rem]'}`,
      header: `${props.direction === 'bottom' ? '!pt-0 !pb-3' : 'pt-0 pb-2'} flex items-center justify-between flex-shrink-0`,
      body: `flex-1 overflow-y-auto min-h-0 custom-scrollbar ${props.direction === 'bottom' ? '!p-0' : ''}`,
      footer: 'mb-2 md:mb-4',
    }"
  >
    <template #header>
      <DrawerTitle v-if="props.title" class="sr-only">{{ props.title }}</DrawerTitle>
      <div v-if="hasHeader" class="flex items-center justify-between w-full" @click.stop>
        <div class="flex-1 min-w-0">
          <slot name="header" />
        </div>
        <UButton
          v-if="props.showClose"
          type="button"
          icon="lucide:x"
          aria-label="Close"
          :color="props.direction === 'bottom' ? 'neutral' : 'error'"
          :variant="props.direction === 'bottom' ? 'ghost' : 'soft'"
          size="md"
          class="relative !h-9 !w-9 !p-0 shrink-0 pointer-coarse:before:absolute pointer-coarse:before:-inset-1 pointer-coarse:before:content-['']"
          @click.stop.prevent="close"
        />
      </div>
    </template>

    <template #body>
      <div @click.stop>
        <slot name="body" />
      </div>
    </template>

    <template v-if="hasFooter" #footer>
      <div v-if="hasFooter" @click.stop>
        <slot name="footer" />
        <div v-if="!slots.footer && hasManagedFooter" class="flex w-full items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div v-if="props.footerHint" class="hidden text-sm text-[var(--text-tertiary)] md:block">
              {{ props.footerHint }}
            </div>
            <UButton
              v-for="action in props.leadingActions"
              :key="action.label"
              :label="action.label"
              v-bind="actionButtonProps(action)"
              :loading-auto="true"
              :type="action.type || 'button'"
              :variant="actionVariant(action, 'outline')"
              :color="actionColor(action, 'neutral')"
              @click="runAction(action)"
            />
            <UButton
              v-if="props.dangerAction"
              :label="props.dangerAction.label"
              v-bind="actionButtonProps(props.dangerAction)"
              :loading-auto="true"
              :type="props.dangerAction.type || 'button'"
              :variant="actionVariant(props.dangerAction, 'solid')"
              :color="actionColor(props.dangerAction, 'error')"
              @click="runAction(props.dangerAction)"
            />
          </div>
          <div class="flex items-center justify-end gap-3">
            <UButton
              v-if="props.cancelAction"
              :label="props.cancelAction.label"
              v-bind="actionButtonProps(props.cancelAction)"
              :loading-auto="true"
              :type="props.cancelAction.type || 'button'"
              :variant="actionVariant(props.cancelAction, 'outline')"
              :color="actionColor(props.cancelAction, 'neutral')"
              @click="runAction(props.cancelAction, true)"
            />
            <UButton
              v-if="props.primaryAction"
              :label="props.primaryAction.label"
              v-bind="actionButtonProps(props.primaryAction)"
              :loading-auto="true"
              :type="props.primaryAction.type || 'button'"
              :variant="actionVariant(props.primaryAction, 'solid')"
              :color="actionColor(props.primaryAction, 'primary')"
              @click="runAction(props.primaryAction)"
            />
          </div>
        </div>
      </div>
    </template>
  </UDrawer>
</template>
