<script setup lang="ts">
import type { HeaderAction } from '~/types/ui';
import { COMPACT_HEADER_ACTION_BUTTON_SIZE } from '~/utils/common/header-action-button';

const props = withDefaults(defineProps<{
  actions?: HeaderAction[];
  side?: 'left' | 'right';
}>(), {
  actions: () => [],
  side: 'right',
});

const { checkPermissionCondition } = usePermissions();
const { isMobile, isTablet } = useScreen();
const hideLabel = computed(() => isMobile.value || isTablet.value);

const visibleActions = computed(() => props.actions.filter(action =>
  (action.side ?? 'right') === props.side &&
  (action.show === undefined || unref(action.show)) &&
  (!action.permission || checkPermissionCondition(action.permission)),
));

function runAction(action: HeaderAction) {
  if (unref(action.disabled) || unref(action.loading)) return undefined;
  if (action.submit) return action.submit();
  if (action.onClick) return action.onClick();
  const to = unref(action.to);
  if (to) return navigateTo(to, { replace: unref(action.replace) });
  return undefined;
}
</script>

<template>
  <div
    v-if="visibleActions.length"
    class="flex min-w-0 shrink-0 items-center gap-2"
    :class="side === 'right' ? 'ml-auto' : undefined"
  >
    <template v-for="action in visibleActions" :key="action.key || action.id">
      <PermissionGate :condition="action.permission">
        <component :is="action.component" v-if="action.component" v-bind="action.props" />
        <UButton
          v-else
          :icon="unref(action.icon)"
          :label="hideLabel ? undefined : unref(action.label)"
          :variant="unref(action.variant) || 'outline'"
          :color="unref(action.color) || 'neutral'"
          :size="action.size || COMPACT_HEADER_ACTION_BUTTON_SIZE"
          :loading-auto="true"
          :loading="unref(action.loading)"
          :disabled="unref(action.disabled) || unref(action.loading)"
          :to="unref(action.to)"
          :replace="unref(action.replace)"
          :square="isHeaderActionIconOnly(action, hideLabel)"
          :class="getHeaderActionButtonClass(action, hideLabel, true)"
          :aria-label="action.ariaLabel || unref(action.label) || action.id"
          @click="runAction(action)"
        />
      </PermissionGate>
    </template>
  </div>
</template>
