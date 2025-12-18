<template>
  <div
    class="h-12 flex items-center shrink-0 relative overflow-hidden border-b border-gray-200 dark:border-gray-800"
    :class="[(isMobile || isTablet) ? 'px-4' : 'px-6', hasRightActions ? 'justify-between' : 'justify-start']"
  >
    
    <div 
      class="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent"
      :class="props.accentPosition === 'top' ? 'top-0' : 'bottom-0'"
    ></div>
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
            :disabled="
              typeof action.disabled === 'boolean'
                ? action.disabled
                : unref(action.disabled)
            "
            @click="action.onClick"
            :class="action.class"
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
            :disabled="
              typeof action.disabled === 'boolean'
                ? action.disabled
                : unref(action.disabled)
            "
            @click="action.onClick"
            :class="action.class"
          />
        </PermissionGate>
      </template>

      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  accentPosition?: 'top' | 'bottom';
}

const props = withDefaults(defineProps<Props>(), {
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
</script>
