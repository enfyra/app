<script setup lang="ts">
import { unref } from 'vue';
import type { DialogFooterAction } from '~/types/ui';

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
    zIndex: 1000,
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

const { isMobile, isTablet } = useScreen();


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
  <UDrawer
    v-if="hasContent"
    v-model:open="isOpen"
    :handle="props.handle"
    :handle-only="props.handleOnly"
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
      <div v-if="hasHeader" class="flex items-center justify-between w-full" @click.stop>
        <div class="flex-1 min-w-0">
          <slot name="header" />
        </div>
        <UButton
          v-if="props.showClose"
          type="button"
          icon="lucide:x"
          color="error"
          variant="soft"
          :size="(isMobile || isTablet) ? 'lg' : 'xl'"
          :class="(isMobile || isTablet) ? 'rounded-full !aspect-square flex-shrink-0' : 'flex-shrink-0'"
          @click.stop.prevent="close"
        />
      </div>
    </template>

    <template #body>
      <div @click.stop>
        <slot name="body" />
      </div>
    </template>

    <template #footer>
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
  </UDrawer>
</template>
