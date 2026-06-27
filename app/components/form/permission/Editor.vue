<template>
  <CommonDrawer
    :handle="false"
    v-model="isOpen"
    direction="right"
    :class="(isMobile || isTablet) ? 'w-full max-w-full' : 'w-full max-w-2xl'"
  >
    <template #header>
      <h3 class="text-lg font-semibold">Edit Permission</h3>
    </template>

      <template #body>
        <div class="p-4 space-y-4">
          
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

          <div>
            <label class="block text-sm font-medium mb-3">Methods</label>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="method in ['GET', 'POST', 'PATCH', 'DELETE']"
                :key="method"
                :color="
                  localPermission?.methods?.includes(method)
                    ? 'primary'
                    : 'neutral'
                "
                :variant="
                  localPermission?.methods?.includes(method)
                    ? 'solid'
                    : 'outline'
                "
                size="xs"
                :disabled="disabled"
                :aria-pressed="localPermission?.methods?.includes(method)"
                @click="toggleMethod(method)"
              >
                <UIcon :name="getMethodIcon(method)" class="w-4 h-4 mr-1.5" />
                {{ method }}
              </UButton>
            </div>
            <p class="text-xs text-muted-foreground mt-2">
              Click to toggle allowed HTTP methods.
            </p>
            <p
              v-if="!localPermission.methods?.length"
              class="text-xs text-error mt-1"
            >
              At least one method is required
            </p>
          </div>

          <div class="flex justify-end gap-2 pt-4 border-t border-muted">
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
    </CommonDrawer>

    <FormPermissionRoutePicker
      v-model="showRoutePicker"
      @select="onRouteSelect"
    />

    <CommonModal
      v-model:open="showDiscardModal"
      :cancel-action="{ label: 'Cancel', onClick: () => (showDiscardModal = false) }"
      :danger-action="{ label: 'Discard Changes', onClick: confirmDiscard }"
    >
      <template #header>Discard Changes</template>
      <template #body>
        <div class="text-sm text-[var(--text-secondary)]">
          You have unsaved changes. Are you sure you want to close? All changes will be lost.
        </div>
      </template>
    </CommonModal>
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
  set: (value) => {
    if (value) {
      emit("update:modelValue", value);
      return;
    }

    handleClose();
  },
});

const localPermission = ref<any>({
  route: "",
  methods: [],
});

const showRoutePicker = ref(false);
const hasChanged = ref(false);
const showDiscardModal = ref(false);
const initialSnapshot = ref("");

const isValid = computed(() => {
  return !!(
    localPermission.value.route && localPermission.value.methods?.length > 0
  );
});

watch(
  () => props.permission,
  (newPermission) => {
    if (newPermission) {
      localPermission.value = {
        ...newPermission,
        methods: [...(newPermission.methods || [])],
      };
    } else {
      localPermission.value = {
        route: "",
        methods: [],
      };
    }
  },
  { immediate: true, deep: true }
);

watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      await nextTick();
      initialSnapshot.value = stableStringify(localPermission.value);
      hasChanged.value = false;
      return;
    }

    showDiscardModal.value = false;
    hasChanged.value = false;
  },
  { immediate: true }
);

watch(
  () => localPermission.value,
  (value) => {
    if (!props.modelValue) return;
    hasChanged.value = stableStringify(value) !== initialSnapshot.value;
  },
  { deep: true }
);

function toggleMethod(method: string) {
  if (!localPermission.value.methods) {
    localPermission.value.methods = [];
  }

  const index = localPermission.value.methods.indexOf(method);
  if (index > -1) {
    localPermission.value.methods.splice(index, 1);
  } else {
    localPermission.value.methods.push(method);
  }
}

function getMethodIcon(method: string): string {
  const icons: Record<string, string> = {
    GET: "lucide:eye",
    POST: "lucide:plus-circle",
    PATCH: "lucide:edit",
    DELETE: "lucide:trash-2",
  };
  return icons[method] || "lucide:shield";
}

function close() {
  emit("update:modelValue", false);
}

function handleClose() {
  if (hasChanged.value) {
    showDiscardModal.value = true;
    return;
  }

  close();
}

function confirmDiscard() {
  showDiscardModal.value = false;
  hasChanged.value = false;
  close();
}

function onRouteSelect(route: any) {
  localPermission.value.route = route.path;
}

function apply() {
  emit("apply", { ...localPermission.value });
  close();
}
</script>
