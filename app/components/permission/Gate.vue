<template>
  <slot v-if="hasPermission" />
</template>

<script setup lang="ts">
import type { PermissionGateProps } from "~/types";

const props = withDefaults(defineProps<PermissionGateProps>(), {
  mode: "any",
});

const { hasAnyPermission, hasAllPermissions, checkPermissionCondition } =
  usePermissions();
const { me } = useAuth();

const hasPermission = computed(() => {
  if (me.value?.isRootAdmin) {
    return true;
  }

  if (props.condition) {
    return checkPermissionCondition(props.condition);
  }

  if (props.routes && props.methods) {
    if (props.mode === "all") {
      return hasAllPermissions(props.routes, props.methods);
    } else {
      return hasAnyPermission(props.routes, props.methods);
    }
  }

  return true;
});
</script>
