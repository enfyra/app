<template>
  <div class="flex items-center justify-between w-full">
    <!-- Left side: Left actions from registry -->
    <div class="flex items-center gap-3 min-w-0 flex-1">
      <!-- Component actions -->
      <component
        v-for="action in headerActions.filter((a) => {
          const showValue =
            a.show === undefined
              ? true
              : isRef(a.show)
              ? unref(a.show)
              : a.show;
          return a && a.component && a.side === 'left' && showValue;
        })"
        :key="action.key || action.id"
        :is="action.component"
        v-bind="action.props"
      />

      <!-- Regular button actions -->
      <UButton
        v-for="action in headerActions.filter((a) => {
          const showValue =
            a.show === undefined
              ? true
              : isRef(a.show)
              ? unref(a.show)
              : a.show;
          return a && !a.component && a.side === 'left' && showValue;
        })"
        :key="action.id"
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
    </div>

    <!-- Right Side Action Buttons -->
    <LayoutHeaderActions />
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { isMobile } = useScreen();
const { headerActions } = useHeaderActionRegistry();
</script>
