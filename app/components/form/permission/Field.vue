<template>
  <div class="flex items-center gap-2">
    <UInput
      :model-value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      class="flex-1"
      @input="handleInput"
    />
    <UButton
      icon="lucide:shield"
      variant="outline"
      color="primary"
      size="sm"
      @click="showDrawer = true"
      :disabled="disabled"
    >
      Permissions
    </UButton>

    <CommonDrawer
      :handle="false"
      v-model="showDrawer"
      direction="right"
      :class="(isMobile || isTablet) ? 'w-full max-w-full' : 'w-full max-w-xl'"
    >
      <template #header>
        <h2 class="text-lg font-semibold">Permission Configuration</h2>
      </template>

        <template #body>
          <div class="p-4 max-h-[80vh] overflow-y-auto">
            <FormPermissionInlineEditor
              v-model="permissionValue"
              :disabled="disabled"
              @update:model-value="handlePermissionUpdate"
            />
          </div>
      </template>
    </CommonDrawer>
  </div>
</template>

<script setup lang="ts">
const { isMobile, isTablet } = useScreen();

const props = defineProps<{
  modelValue?: string;
  placeholder?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const showDrawer = ref(false);
const permissionValue = ref<any>(null);

watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      try {
        permissionValue.value = JSON.parse(newValue);
      } catch {
        permissionValue.value = null;
      }
    } else {
      permissionValue.value = null;
    }
  },
  { immediate: true }
);

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit("update:modelValue", target.value);
}

function handlePermissionUpdate(value: any) {
  const permissionString = value ? JSON.stringify(value) : "";
  emit("update:modelValue", permissionString);
}
</script>
