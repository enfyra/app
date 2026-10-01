<template>
  <UDashboardToolbar
    :class="hasRightActions ? 'justify-between' : 'justify-start'"
  >

    <div class="flex items-center gap-1.5 md:gap-3">
      <template v-for="action in leftActions" :key="action.key || action.id">
        <PermissionGate :condition="action.permission">

          <component
            v-if="action.component"
            :is="action.component"
            v-bind="action.props"
          />

          <UButton
            v-else
            :icon="isRef(action.icon) ? unref(action.icon) : action.icon"
            :label="(isMobile || isTablet) ? undefined : (isRef(action.label) ? unref(action.label) : action.label)"
            :variant="
              (isRef(action.variant)
                ? unref(action.variant)
                : action.variant) || 'soft'
            "
            :color="
              (isRef(action.color) ? unref(action.color) : action.color) ||
              'neutral'
            "
            :size="(isMobile || isTablet) ? 'lg' : action.size || 'md'"
            :loading-auto="true"
            :disabled="
              (typeof action.disabled === 'boolean'
                ? action.disabled
                : unref(action.disabled)) || unref(action.loading)
            "
            :loading="unref(action.loading)"
            :square="isHeaderActionIconOnly(action, isMobile || isTablet)"
            @click="handleSubHeaderActionClick(action)"
            :class="getHeaderActionButtonClass(action)"
          />
        </PermissionGate>
      </template>
    </div>

    <div class="flex items-center gap-2">
      <template v-for="action in rightActions" :key="action.key || action.id">
        <PermissionGate :condition="action.permission">

          <component
            v-if="action.component"
            :is="action.component"
            v-bind="action.props"
          />

          <UButton
            v-else
            :icon="isRef(action.icon) ? unref(action.icon) : action.icon"
            :label="(isMobile || isTablet) ? undefined : (isRef(action.label) ? unref(action.label) : action.label)"
            :variant="
              (isRef(action.variant)
                ? unref(action.variant)
                : action.variant) || 'soft'
            "
            :color="
              (isRef(action.color) ? unref(action.color) : action.color) ||
              'neutral'
            "
            :size="(isMobile || isTablet) ? 'lg' : action.size || 'md'"
            :loading-auto="true"
            :disabled="
              (typeof action.disabled === 'boolean'
                ? action.disabled
                : unref(action.disabled)) || unref(action.loading)
            "
            :loading="unref(action.loading)"
            :square="isHeaderActionIconOnly(action, isMobile || isTablet)"
            @click="handleSubHeaderActionClick(action)"
            :class="getHeaderActionButtonClass(action)"
          />
        </PermissionGate>
      </template>

      <slot name="actions" />
    </div>
  </UDashboardToolbar>
</template>

<script setup lang="ts">
interface Props {
  accentPosition?: 'top' | 'bottom';
}

withDefaults(defineProps<Props>(), {
  accentPosition: 'bottom',
});

const { isMobile, isTablet } = useScreen();
const { subHeaderActions } = useSubHeaderActionRegistry();

const leftActions = computed(() => {
  return subHeaderActions.value.filter((a) => {
    const showValue =
      a.show === undefined ? true : isRef(a.show) ? unref(a.show) : a.show;
    return a && a.side === "left" && showValue;
  });
});

const rightActions = computed(() => {
  return subHeaderActions.value.filter((a) => {
    const showValue =
      a.show === undefined ? true : isRef(a.show) ? unref(a.show) : a.show;
    return a && a.side === "right" && showValue;
  });
});

const hasRightActions = computed(() => {
  return rightActions.value.length > 0;
});

function handleSubHeaderActionClick(action: any) {
  return action.onClick?.();
}
</script>
