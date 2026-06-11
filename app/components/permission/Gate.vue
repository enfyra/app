<template>
  <div
    v-if="hasPermission && hasAttrs"
    v-bind="attrs"
  >
    <slot />
  </div>
  <slot v-else-if="hasPermission" />
</template>

<script setup lang="ts">
import type { PermissionGateProps } from "~/types";

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(defineProps<PermissionGateProps>(), {
  mode: "any",
});

const attrs = useAttrs();
const { hasAnyPermission, hasAllPermissions, checkPermissionCondition } =
  usePermissions();
const { me } = useAuth();

const hasAttrs = computed(() => Object.keys(attrs).length > 0);

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
