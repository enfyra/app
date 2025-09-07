<template>
  <div
    class="h-12 border-b border-gray-700 flex items-center justify-between bg-background shrink-0"
    :class="isTablet ? 'px-4' : 'px-6'"
  >
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
</script>
