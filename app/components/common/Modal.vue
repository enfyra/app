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

const { isMobile, isTablet } = useScreen();

const mergedUi = computed(() => ({
  ...props.ui,
  content: ['eapp-modal-surface', props.ui?.content].filter(Boolean).join(' '),
  header: ['pb-0', props.ui?.header].filter(Boolean).join(' '),
  body: ['pt-4', props.ui?.body].filter(Boolean).join(' '),
}));

function close() {
  isOpen.value = false;
}

function runAction(action: DialogFooterAction | false | undefined, fallbackClose = false) {
  if (!action) return;
  if (action.onClick) {
    action.onClick();
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

function actionState(value: DialogFooterAction['loading'] | DialogFooterAction['disabled']) {
  return value == null ? undefined : unref(value);
}

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
          <div v-if="!slots.footer && hasManagedFooter" class="flex w-full items-center justify-between gap-3 border-t border-[var(--border-default)] pt-4">
            <div class="flex items-center gap-3">
              <div v-if="props.footerHint" class="hidden text-sm text-[var(--text-tertiary)] md:block">
                {{ props.footerHint }}
              </div>
              <UButton
                v-for="action in props.leadingActions"
                :key="action.label"
                :label="action.label"
                :icon="action.icon"
                :loading="actionState(action.loading)"
                :disabled="actionState(action.disabled)"
                :type="action.type || 'button'"
                :form="action.form"
                :variant="actionVariant(action, 'outline')"
                :color="actionColor(action, 'neutral')"
                @click="runAction(action)"
              />
              <UButton
                v-if="props.dangerAction"
                :label="props.dangerAction.label"
                :icon="props.dangerAction.icon"
                :loading="actionState(props.dangerAction.loading)"
                :disabled="actionState(props.dangerAction.disabled)"
                :type="props.dangerAction.type || 'button'"
                :form="props.dangerAction.form"
                :variant="actionVariant(props.dangerAction, 'solid')"
                :color="actionColor(props.dangerAction, 'error')"
                @click="runAction(props.dangerAction)"
              />
            </div>
            <div class="flex items-center justify-end gap-3">
              <UButton
                v-if="props.cancelAction"
                :label="props.cancelAction.label"
                :icon="props.cancelAction.icon"
                :loading="actionState(props.cancelAction.loading)"
                :disabled="actionState(props.cancelAction.disabled)"
                :type="props.cancelAction.type || 'button'"
                :form="props.cancelAction.form"
                :variant="actionVariant(props.cancelAction, 'outline')"
                :color="actionColor(props.cancelAction, 'neutral')"
                @click="runAction(props.cancelAction, true)"
              />
              <UButton
                v-if="props.primaryAction"
                :label="props.primaryAction.label"
                :icon="props.primaryAction.icon"
                :loading="actionState(props.primaryAction.loading)"
                :disabled="actionState(props.primaryAction.disabled)"
                :type="props.primaryAction.type || 'button'"
                :form="props.primaryAction.form"
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
