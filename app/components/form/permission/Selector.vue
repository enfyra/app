<template>
  <div class="space-y-4">
    <!-- Allow All Toggle -->
    <div class="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
      <div>
        <label class="text-sm font-medium">Allow All Access</label>
        <p class="text-xs text-muted-foreground mt-1">
          Skip all permission checks
        </p>
      </div>
      <USwitch
        v-model="isAllowAll"
        :disabled="props.disabled"
        @update:model-value="handleAllowAllChange"
      />
    </div>

    <!-- Current Permission Structure -->
    <div v-if="!isAllowAll" class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-muted-foreground">
          Permission Structure
        </h3>
      </div>
      <div class="space-y-2">
        <FormPermissionGroup
          v-if="currentGroups.length > 0"
          :group="currentGroups[0]"
          :disabled="props.disabled"
          :isRoot="true"
          @update:group="(updatedGroup: any) => updateGroup(0, updatedGroup)"
          @remove="() => removeGroup(0)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  permissionGroups: any[];
  disabled?: boolean;
  allowAll?: boolean;
}>();

const emit = defineEmits(["update"]);

const currentGroups = ref<any[]>([]);
const isAllowAll = ref(false);
const groupsOperator = ref("and");

// Initialize from props
onMounted(() => {
  // Set allowAll from prop
  if (props.allowAll !== undefined) {
    isAllowAll.value = props.allowAll;
  }
  
  // Set permission groups from prop
  if (props.permissionGroups && props.permissionGroups.length > 0) {
    currentGroups.value = [...props.permissionGroups];
  } else if (!isAllowAll.value) {
    // Create default group if none exists and not allowAll
    currentGroups.value = [
      {
        id: Math.random().toString(36).substring(2, 9),
        type: "and",
        conditions: [],
      },
    ];
  }
  
  // Don't emit on mount - parent should already have the data
});

// Watch for changes in permissionGroups prop (after mount)
watch(
  () => props.permissionGroups,
  (newGroups) => {
    if (newGroups && newGroups.length > 0) {
      currentGroups.value = [...newGroups];
    } else if (!isAllowAll.value) {
      // Create default group if none exists
      currentGroups.value = [
        {
          id: Math.random().toString(36).substring(2, 9),
          type: "and",
          conditions: [],
        },
      ];
    }
  }
);

// Watch for allowAll prop changes (after mount)
watch(
  () => props.allowAll,
  (newValue) => {
    if (newValue !== undefined && newValue !== isAllowAll.value) {
      isAllowAll.value = newValue;
    }
  }
);

function updateGroup(groupIndex: number, updatedGroup: any) {
  currentGroups.value[groupIndex] = updatedGroup;
  emitUpdate();
}

function removeGroup(groupIndex: number) {
  currentGroups.value.splice(groupIndex, 1);
  emitUpdate();
}

function handleAllowAllChange(value: boolean) {
  isAllowAll.value = value;
  if (value) {
    // Clear groups when enabling allowAll
    currentGroups.value = [];
  } else {
    // Create default group when disabling allowAll
    currentGroups.value = [
      {
        id: Math.random().toString(36).substring(2, 9),
        type: "and",
        conditions: [],
      },
    ];
  }
  emitUpdate();
}

function emitUpdate() {
  if (isAllowAll.value) {
    emit("update", { allowAll: true });
  } else if (currentGroups.value.length > 0) {
    // Return the single root group (which may contain nested groups)
    emit("update", currentGroups.value[0]);
  }
}
</script>
