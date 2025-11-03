<template>
  <Teleport to="body">
    <UDrawer
      :handle="false"
      v-model:open="isOpen"
      direction="right"
      :class="(isMobile || isTablet) ? 'w-full max-w-full' : 'w-full max-w-2xl'"
      :ui="{
        header:
          'border-b border-muted text-muted pb-2 flex items-center justify-between',
      }"
    >
      <template #header>
        <h3 class="text-lg font-semibold">Edit Permission</h3>
        <UButton
          @click="close"
          icon="lucide:x"
          color="error"
          variant="ghost"
          size="lg"
        />
      </template>

      <template #body>
        <div class="p-4 space-y-4">
          <!-- Route Selection -->
          <div>
            <label class="block text-sm font-medium mb-2">Route</label>
            <div class="flex gap-2">
              <div
                class="flex-1 p-3 border border-muted rounded-lg bg-muted/10"
              >
                <div
                  v-if="localPermission.route"
                  class="flex items-center gap-2"
                >
                  <UIcon name="lucide:route" class="w-4 h-4 text-primary" />
                  <span class="font-mono text-sm">{{
                    localPermission.route
                  }}</span>
                </div>
                <div
                  v-else
                  class="flex items-center gap-2 text-muted-foreground"
                >
                  <UIcon name="lucide:route" class="w-4 h-4" />
                  <span class="text-sm italic"
                    >Click "Select Route" to choose a route</span
                  >
                </div>
              </div>
              <UButton
                icon="lucide:search"
                variant="outline"
                @click="showRoutePicker = true"
                :disabled="disabled"
              >
                Select Route
              </UButton>
            </div>
            <p v-if="!localPermission.route" class="text-xs text-error mt-1">
              Route is required
            </p>
          </div>

          <!-- Actions Selection -->
          <div>
            <label class="block text-sm font-medium mb-3">Actions</label>
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="action in ['create', 'read', 'update', 'delete']"
                :key="action"
                :color="
                  localPermission?.actions?.includes(action)
                    ? 'primary'
                    : 'neutral'
                "
                :variant="
                  localPermission?.actions?.includes(action)
                    ? 'solid'
                    : 'outline'
                "
                size="md"
                class="cursor-pointer px-3 py-1.5 transition-all"
                @click="toggleAction(action)"
              >
                <UIcon :name="getActionIcon(action)" class="w-4 h-4 mr-1.5" />
                {{ action.charAt(0).toUpperCase() + action.slice(1) }}
              </UBadge>
            </div>
            <p class="text-xs text-muted-foreground mt-2">
              Click to toggle permissions
            </p>
            <p
              v-if="!localPermission.actions?.length"
              class="text-xs text-error mt-1"
            >
              At least one action is required
            </p>
          </div>


          <!-- Buttons -->
          <div class="flex justify-end gap-2 pt-4 border-t border-muted">
            <UButton variant="outline" color="error" @click="close"> Cancel </UButton>
            <UButton
              color="primary"
              @click="apply"
              :disabled="disabled || !isValid"
            >
              Apply Changes
            </UButton>
          </div>
        </div>
      </template>
    </UDrawer>

    <!-- Route Picker -->
    <FormPermissionRoutePicker
      v-model="showRoutePicker"
      @select="onRouteSelect"
    />
  </Teleport>
</template>

<script setup lang="ts">
const { isMobile, isTablet } = useScreen();

const props = defineProps<{
  modelValue: boolean;
  permission?: any;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  apply: [permission: any];
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const localPermission = ref<any>({
  route: "",
  actions: [],
});

const showRoutePicker = ref(false);

// Validation
const isValid = computed(() => {
  return !!(
    localPermission.value.route && localPermission.value.actions?.length > 0
  );
});

// Watch for permission changes
watch(
  () => props.permission,
  (newPermission) => {
    if (newPermission) {
      localPermission.value = {
        ...newPermission,
        actions: [...(newPermission.actions || [])],
      };
    }
  },
  { immediate: true, deep: true }
);

function toggleAction(action: string) {
  if (!localPermission.value.actions) {
    localPermission.value.actions = [];
  }

  const index = localPermission.value.actions.indexOf(action);
  if (index > -1) {
    localPermission.value.actions.splice(index, 1);
  } else {
    localPermission.value.actions.push(action);
  }
}

function getActionIcon(action: string): string {
  const icons: Record<string, string> = {
    create: "lucide:plus-circle",
    read: "lucide:eye",
    update: "lucide:edit",
    delete: "lucide:trash-2",
  };
  return icons[action] || "lucide:shield";
}

function close() {
  emit("update:modelValue", false);
}

function onRouteSelect(route: any) {
  localPermission.value.route = route.path;
}

function apply() {
  emit("apply", { ...localPermission.value });
  close();
}
</script>
