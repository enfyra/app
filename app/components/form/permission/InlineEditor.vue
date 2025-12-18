<template>
  <div>
    
    <UInput
      readonly
      :disabled="props.disabled"
      :model-value="displayValue"
      :placeholder="placeholder"
      @click="showModal = true"
      class="w-full"
      :ui="{
        root: 'lg:hover:!bg-muted/50 lg:hover:!border-primary/50 transition-colors',
        base: 'transition-all duration-200 !cursor-pointer',
      }"
    >
      <template #leading>
        <UIcon :name="leadingIcon" :class="iconClass" />
      </template>

      <template #trailing>
        <UIcon
          name="lucide:chevron-right"
          class="w-4 h-4 text-muted-foreground"
        />
      </template>
    </UInput>

    <CommonDrawer
      :handle="false"
      v-model="showModal"
      direction="right"
      :class="(isMobile || isTablet) ? 'w-full max-w-full' : 'w-full max-w-3xl'"
    >
      <template #header>
        <h2 class="text-lg font-semibold">Permission Configuration</h2>
      </template>

        <template #body>
          <FormPermissionSelector
            :permission-groups="localFormPermissionGroups"
            :allow-all="localAllowAll"
            @update="updateLocalPermissionGroups"
          />
        </template>

        <template #footer>
          <div
            class="flex justify-end gap-3 rounded-xl border border-muted/30 p-4 bg-gray-800/50"
          >
            <UButton
              icon="lucide:check"
              variant="solid"
              color="primary"
              @click="applyFormPermissionGroups"
              :disabled="props.disabled"
            >
              Apply
            </UButton>
          </div>
      </template>
    </CommonDrawer>
  </div>
</template>

<script setup lang="ts">
const { isMobile, isTablet } = useScreen();

const props = defineProps<{
  modelValue: any;
  disabled?: boolean;
}>();

const emit = defineEmits(["update:modelValue"]);
const showModal = ref(false);
const hasApplied = ref(false);

const originalPermissionGroups = ref<any[]>([]);

const localFormPermissionGroups = ref<any[]>([]);

const localAllowAll = ref(false);

const isAllowAll = computed(() => {
  return props.modelValue?.allowAll === true;
});

const permissionGroups = computed(() => {
  if (!props.modelValue) return [];

  if (props.modelValue.allowAll === true) {
    return [];
  }

  if (Array.isArray(props.modelValue)) {
    
    return [
      {
        type: "and",
        conditions: props.modelValue,
      },
    ];
  }

  if (typeof props.modelValue === "object") {
    
    if (props.modelValue.and) {
      return [
        {
          type: "and",
          conditions: props.modelValue.and,
        },
      ];
    }
    if (props.modelValue.or) {
      return [
        {
          type: "or",
          conditions: props.modelValue.or,
        },
      ];
    }
    
    if (props.modelValue.route) {
      return [
        {
          type: "and",
          conditions: [props.modelValue],
        },
      ];
    }
  }

  return [];
});

watch(
  () => showModal.value,
  (isOpen) => {
    if (isOpen) {
      
      hasApplied.value = false;
      
      originalPermissionGroups.value = JSON.parse(
        JSON.stringify(permissionGroups.value)
      );
      localFormPermissionGroups.value = JSON.parse(
        JSON.stringify(permissionGroups.value)
      );
    } else if (!hasApplied.value) {

      localFormPermissionGroups.value = JSON.parse(
        JSON.stringify(originalPermissionGroups.value)
      );
    }
  }
);

watch(
  permissionGroups,
  (newGroups) => {
    if (!showModal.value) {
      
      originalPermissionGroups.value = JSON.parse(JSON.stringify(newGroups));
      localFormPermissionGroups.value = JSON.parse(JSON.stringify(newGroups));
      
      localAllowAll.value = props.modelValue?.allowAll === true;
    }
  },
  { immediate: true, deep: true }
);

watch(showModal, (isOpen) => {
  if (isOpen) {
    
    hasApplied.value = false;
    
    localAllowAll.value = props.modelValue?.allowAll === true;
    if (localAllowAll.value) {
      localFormPermissionGroups.value = [];
    } else {
      localFormPermissionGroups.value = [...permissionGroups.value];
    }
  }
});

function updateModelValue() {
  let result;

  if (localFormPermissionGroups.value.length === 0) {
    result = null;
  } else if (localFormPermissionGroups.value.length === 1) {
    const group = localFormPermissionGroups.value[0];
    const conditions = group.conditions || group.rules || [];
    if (group.type === "and") {
      result = { and: conditions };
    } else {
      result = { or: conditions };
    }
  } else {
    
    const andGroups = localFormPermissionGroups.value.map((group: any) => ({
      [group.type]: group.conditions || group.rules || [],
    }));
    result = { and: andGroups };
  }

  emit("update:modelValue", result);
}

function updateLocalPermissionGroups(data: any) {
  
  if (data?.allowAll === true) {
    
    localAllowAll.value = true;
    localFormPermissionGroups.value = [];
  } else if (data) {
    
    localAllowAll.value = false;
    localFormPermissionGroups.value = Array.isArray(data) ? [...data] : [data];
  }
  
}

function applyFormPermissionGroups() {
  
  hasApplied.value = true;

  if (localAllowAll.value) {
    
    emit("update:modelValue", { allowAll: true });
  } else if (localFormPermissionGroups.value.length > 0) {
    
    updateModelValue();
  } else {
    
    emit("update:modelValue", null);
  }
  showModal.value = false;
}

function closeModal() {
  
  showModal.value = false;
}

function cancelChanges() {
  
  localFormPermissionGroups.value = JSON.parse(
    JSON.stringify(originalPermissionGroups.value)
  );
  showModal.value = false;
}

function getTotalPermissions(): number {
  return localFormPermissionGroups.value.reduce((total, group) => {
    const conditions = group.conditions || group.rules || [];
    return total + conditions.length;
  }, 0);
}

const displayValue = computed(() => {
  if (isAllowAll.value) {
    return "Allow All Access";
  } else if (getTotalPermissions() > 0) {
    const count = getTotalPermissions();
    return `${count} permission${count !== 1 ? "s" : ""} configured`;
  }
  return "";
});

const placeholder = computed(() => {
  if (isAllowAll.value || getTotalPermissions() > 0) {
    return "";
  }
  return "Click to configure permissions";
});

const leadingIcon = computed(() => {
  if (isAllowAll.value) return "lucide:shield-check";
  if (getTotalPermissions() > 0) return "lucide:shield";
  return "lucide:shield-off";
});

const iconClass = computed(() => {
  const baseClass = "w-4 h-4";
  if (isAllowAll.value) return `${baseClass} text-success`;
  if (getTotalPermissions() > 0) return `${baseClass} text-primary`;
  return `${baseClass} text-muted-foreground`;
});
</script>
