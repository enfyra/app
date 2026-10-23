<template>
  <UDashboardToolbar
    :class="hasRightActions || (!isDesktop && menuActions.length) ? 'justify-between' : 'justify-start'"
  >

    <div class="flex items-center gap-1.5 md:gap-3">
      <template v-for="action in leftActions" :key="action.key || action.id">
        <PermissionGate v-bind="action.permission === undefined ? {} : { condition: action.permission }">

          <component
            v-if="action.component"
            :is="action.component"
            v-bind="action.props"
          />

          <UButton
            v-else
            v-bind="getHeaderActionButtonProps(action, isMobile || isTablet)"
            :variant="resolveHeaderActionVariant(action, { fallback: 'soft', hideLabel: isMobile || isTablet, shaped: !isDesktop })"
            :color="
              (isRef(action.color) ? unref(action.color) : action.color) ||
              'neutral'
            "
            :size="(isMobile || isTablet) ? 'lg' : action.size || 'md'"
            :loading-auto="true"
            :square="isHeaderActionIconOnly(action, isMobile || isTablet)"
            @click="handleSubHeaderActionClick(action)"
            :class="getHeaderActionButtonClass(action, isMobile || isTablet)"
          />
        </PermissionGate>
      </template>
    </div>

    <div class="flex items-center gap-2">
      <template v-for="action in rightActions" :key="action.key || action.id">
        <PermissionGate v-bind="action.permission === undefined ? {} : { condition: action.permission }">

          <component
            v-if="action.component"
            :is="action.component"
            v-bind="action.props"
          />

          <UButton
            v-else
            v-bind="getHeaderActionButtonProps(action, isMobile || isTablet)"
            :variant="resolveHeaderActionVariant(action, { fallback: 'soft', hideLabel: isMobile || isTablet, shaped: !isDesktop })"
            :color="
              (isRef(action.color) ? unref(action.color) : action.color) ||
              'neutral'
            "
            :size="(isMobile || isTablet) ? 'lg' : action.size || 'md'"
            :loading-auto="true"
            :square="isHeaderActionIconOnly(action, isMobile || isTablet)"
            @click="handleSubHeaderActionClick(action)"
            :class="getHeaderActionButtonClass(action, isMobile || isTablet)"
          />
        </PermissionGate>
      </template>

      <LayoutSubHeaderMenu v-if="!isDesktop" />
      <slot name="actions" />
    </div>
  </UDashboardToolbar>
</template>

<script setup lang="ts">
import type { HeaderAction } from '~/types/ui';

interface Props {
  accentPosition?: 'top' | 'bottom';
}

withDefaults(defineProps<Props>(), {
  accentPosition: 'bottom',
});

const { isMobile, isTablet } = useScreen();
const { isDesktop, menuActions, leftActions, rightActions, runAction } = useSubHeaderActionPresentation();

const hasRightActions = computed(() => {
  return rightActions.value.length > 0;
});

function handleSubHeaderActionClick(action: HeaderAction) {
  return runAction(action);
}
</script>
