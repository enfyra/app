<script setup lang="ts">
import { unref } from 'vue';
import type { DialogFooterAction } from '~/types/ui';

const props = withDefaults(
  defineProps<{
    open?: boolean;
    class?: string;
    handle?: boolean;
    preventClose?: boolean;
    ui?: Record<string, string>;
    cancelAction?: DialogFooterAction | false;
    primaryAction?: DialogFooterAction | false;
    dangerAction?: DialogFooterAction | false;
    leadingActions?: DialogFooterAction[];
    footerHint?: string | false;
  }>(),
  {
    open: false,
    handle: false,
    preventClose: false,
    cancelAction: false,
    primaryAction: false,
    dangerAction: false,
    leadingActions: () => [],
    footerHint: false,
  }
);

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const slots = useSlots();
const hasTitle = computed(() => !!slots.header);
const hasManagedFooter = computed(() => Boolean(props.cancelAction || props.primaryAction || props.dangerAction || props.leadingActions.length || props.footerHint));
const hasFooter = computed(() => !!slots.footer || hasManagedFooter.value);
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

const { lock, unlock } = useOverlayScrollLock();

watch(
  () => isOpen.value && hasContent.value,
  (open) => open ? lock() : unlock(),
  { immediate: true, flush: 'sync' },
);

const mergedUi = computed(() => ({
  ...props.ui,
  content: ['eapp-modal-surface', props.ui?.content].filter(Boolean).join(' '),
}));

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
    <UModal
      v-if="hasContent"
      v-model:open="isOpen"
      :handle="props.handle"
      :class="props.class"
      :ui="mergedUi"
      :close="{ color: 'error', variant: 'soft', size: 'md', class: '!h-9 !w-9 !p-0' }"
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

      <template v-if="hasFooter" #footer>
        <div v-if="hasFooter" class="w-full" @click.stop>
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
    </UModal>
</template>
