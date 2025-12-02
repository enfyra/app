<template>
  <div class="flex gap-2">
    <!-- Component actions -->
    <template
      v-for="action in visibleComponentActions"
      :key="action.key || action.id"
    >
      <PermissionGate :condition="action.permission">
        <component :is="action.component" v-bind="action.props" />
      </PermissionGate>
    </template>

    <!-- Regular button actions -->
    <template v-for="action in visibleButtonActions" :key="action.id">
      <PermissionGate :condition="action.permission">
        <UButton
          :label="
            (isMobile || isTablet)
              ? undefined
              : isRef(action.label)
              ? unref(action.label)
              : action.label
          "
          :icon="isRef(action.icon) ? unref(action.icon) : action.icon"
          :variant="
            (isRef(action.variant) ? unref(action.variant) : action.variant) ||
            'solid'
          "
          :color="
            (isRef(action.color) ? unref(action.color) : action.color) ||
            'primary'
          "
          :size="(isMobile || isTablet) ? 'lg' : action.size || 'md'"
          :loading="unref(action.loading)"
          :disabled="unref(action.disabled)"
          :to="unref(action.to)"
          :replace="unref(action.replace)"
          :aria-label="action.label || action.id"
          :class="action.class"
          @click="handleActionClick(action)"
          class="cursor-pointer"
        />
      </PermissionGate>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { headerActions } = useHeaderActionRegistry();
const { isMobile, isTablet } = useScreen();

const visibleActions = computed(() => {
  const filtered = headerActions.value.filter((action) => {
    const currentPath = route.path;

    if (
      action.hideOn &&
      action.hideOn.some((path) => currentPath.startsWith(path))
    ) {
      return false;
    }

    if (
      action.showOn &&
      !action.showOn.some((path) => currentPath.startsWith(path))
    ) {
      return false;
    }

    // Check show property
    const showValue =
      action.show === undefined
        ? true
        : isRef(action.show)
        ? unref(action.show)
        : action.show;

    if (!showValue) {
      return false;
    }

    return true;
  });

  return filtered.filter((action) => action.side === "right" || !action.side);
});

const visibleComponentActions = computed(() => {
  return visibleActions.value.filter((action) => action.component);
});

const visibleButtonActions = computed(() => {
  return visibleActions.value.filter((action) => !action.component);
});

const handleActionClick = (action: HeaderAction) => {
  if (action.submit) {
    action.submit();
  } else if (action.onClick) {
    action.onClick();
  }
};
</script>
