<template>
  <div class="flex items-center justify-between w-full">
    
    <div class="flex items-center gap-1.5 md:gap-3 min-w-0 flex-1">
      <template v-for="action in leftActions" :key="action.key || action.id">
        
        <component
          v-if="action.component"
          :is="action.component"
          v-bind="action.props"
        />

        <UButton
          v-else
          :icon="isRef(action.icon) ? unref(action.icon) : action.icon"
          :label="isRef(action.label) ? unref(action.label) : action.label"
          :variant="
            (isRef(action.variant) ? unref(action.variant) : action.variant) ||
            'soft'
          "
          :color="
            (isRef(action.color) ? unref(action.color) : action.color) ||
            'neutral'
          "
          :size="action.size || (isMobile ? 'sm' : 'md')"
          :disabled="
            typeof action.disabled === 'boolean'
              ? action.disabled
              : unref(action.disabled)
          "
          @click="action.onClick"
          :class="action.class"
        />
      </template>
    </div>

    <LayoutHeaderActions />
  </div>
</template>

<script setup lang="ts">
const { isMobile } = useScreen();
const { headerActions } = useHeaderActionRegistry();

const leftActions = computed(() => {
  return headerActions.value.filter((a) => {
    const showValue =
      a.show === undefined
        ? true
        : isRef(a.show)
        ? unref(a.show)
        : a.show;
    return a && a.side === 'left' && showValue;
  });
});
</script>
