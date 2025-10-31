<template>
  <div
    class="h-12 border-b flex items-center shrink-0 relative overflow-hidden backdrop-blur-sm"
    :class="[isTablet ? 'px-4' : 'px-6', hasRightActions ? 'justify-between' : 'justify-start']"
    :style="{
      borderColor: 'var(--border-subtle)',
      background: 'rgba(15, 20, 33, 0.6)'
    }"
  >
    <!-- Blue gradient accent at top -->
    <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#0066FF]/30 to-transparent"></div>
    <div class="flex items-center gap-3">
      <template
        v-for="action in subHeaderActions.filter((a) => {
          const showValue =
            a.show === undefined
              ? true
              : isRef(a.show)
              ? unref(a.show)
              : a.show;
          return a && a.component && a.side === 'left' && showValue;
        })"
        :key="action.key || action.id"
      >
        <PermissionGate :condition="action.permission">
          <component :is="action.component" v-bind="action.props" />
        </PermissionGate>
      </template>

      <!-- Regular button actions -->
      <template
        v-for="action in subHeaderActions.filter((a) => {
          const showValue =
            a.show === undefined
              ? true
              : isRef(a.show)
              ? unref(a.show)
              : a.show;
          return a && !a.component && a.side === 'left' && showValue;
        })"
        :key="action.id"
      >
        <PermissionGate :condition="action.permission">
          <UButton
            :icon="isRef(action.icon) ? unref(action.icon) : action.icon"
            :label="isRef(action.label) ? unref(action.label) : action.label"
            :variant="
              (isRef(action.variant)
                ? unref(action.variant)
                : action.variant) || 'soft'
            "
            :color="
              (isRef(action.color) ? unref(action.color) : action.color) ||
              'neutral'
            "
            :size="action.size || (isTablet ? 'sm' : 'md')"
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

    <!-- Right Side Actions -->
    <div class="flex items-center gap-2">
      <!-- Component actions -->
      <template
        v-for="action in subHeaderActions.filter((a) => {
          const showValue =
            a.show === undefined
              ? true
              : isRef(a.show)
              ? unref(a.show)
              : a.show;
          return a && a.component && a.side === 'right' && showValue;
        })"
        :key="action.key || action.id"
      >
        <PermissionGate :condition="action.permission">
          <component :is="action.component" v-bind="action.props" />
        </PermissionGate>
      </template>

      <!-- Regular button actions -->
      <template
        v-for="action in subHeaderActions.filter((a) => {
          const showValue =
            a.show === undefined
              ? true
              : isRef(a.show)
              ? unref(a.show)
              : a.show;
          return a && !a.component && a.side === 'right' && showValue;
        })"
        :key="action.id"
      >
        <PermissionGate :condition="action.permission">
          <UButton
            :icon="isRef(action.icon) ? unref(action.icon) : action.icon"
            :label="isRef(action.label) ? unref(action.label) : action.label"
            :variant="
              (isRef(action.variant)
                ? unref(action.variant)
                : action.variant) || 'soft'
            "
            :color="
              (isRef(action.color) ? unref(action.color) : action.color) ||
              'neutral'
            "
            :size="action.size || (isTablet ? 'sm' : 'md')"
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

      <!-- Fallback slot for manual actions -->
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { isTablet } = useScreen();
const { subHeaderActions } = useSubHeaderActionRegistry();

// Check if there are any right-side actions
const hasRightActions = computed(() => {
  return subHeaderActions.value.some((a) => {
    const showValue =
      a.show === undefined ? true : isRef(a.show) ? unref(a.show) : a.show;
    return a.side === "right" && showValue;
  });
});
</script>
