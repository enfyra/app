<template>
  <div v-if="hasPermission">
    <slot />
  </div>
</template>

<script setup lang="ts">
import type { PermissionGateProps } from "../utils/types";

const props = withDefaults(defineProps<PermissionGateProps>(), {
  mode: "any",
});

const { hasAnyPermission, hasAllPermissions, checkPermissionCondition } =
  usePermissions();
const { me } = useEnfyraAuth();

const hasPermission = computed(() => {
  if (me.value?.isRootAdmin) {
    return true;
  }

  if (props.condition) {
    return checkPermissionCondition(props.condition);
  }

  // Fallback to legacy approach
  if (props.routes && props.actions) {
    if (props.mode === "all") {
      return hasAllPermissions(props.routes, props.actions);
    } else {
      return hasAnyPermission(props.routes, props.actions);
    }
  }

  return true;
});
</script>
