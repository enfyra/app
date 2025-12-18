<template>
  <div class="space-y-4">
    
    <div class="flex items-center gap-2" v-if="group.conditions?.length > 1">
      <USelect
        v-if="!disabled"
        v-model="group.type"
        :items="[
          { label: 'AND', value: 'and' },
          { label: 'OR', value: 'or' },
        ]"
        @update:model-value="updateGroup"
        size="xs"
        class="w-20"
      />
      <span v-else class="text-xs px-2 py-1 bg-gray-100 rounded">
        {{ group.type.toUpperCase() }}
      </span>
    </div>

    <div class="space-y-2 pl-4 border-l-2 border-muted">
      <template v-for="(item, index) in group.conditions" :key="item.id">
        
        <div
          v-if="isPermission(item)"
          class="flex items-center justify-between p-3 border border-muted rounded-lg lg:hover:bg-muted/50 cursor-pointer transition-colors"
          @click="editPermission(index, item)"
        >
          <div class="flex items-center gap-2">
            <UIcon
              :name="item.allowAll ? 'lucide:shield-check' : 'lucide:shield'"
              :class="
                item.allowAll ? 'w-4 h-4 text-success' : 'w-4 h-4 text-primary'
              "
            />
            <template v-if="item.allowAll">
              <span class="font-medium text-sm text-success"
                >Allow All - No Restrictions</span
              >
            </template>
            <template v-else>
              <span class="font-mono text-sm">{{
                item.route || "No route"
              }}</span>
              <UBadge
                v-for="action in item.actions"
                :key="action"
                size="sm"
                variant="soft"
                color="secondary"
              >
                {{ action }}
              </UBadge>
            </template>
          </div>
          <div class="flex items-center gap-1">
            <UButton
              icon="lucide:trash"
              size="md"
              variant="ghost"
              color="error"
              @click.stop="removeItem(index)"
              :disabled="disabled"
            />
          </div>
        </div>

        <div v-else class="border border-muted rounded-lg p-3 relative">
          <UButton
            v-if="!disabled"
            @click="removeItem(index)"
            icon="lucide:x"
            size="xs"
            color="error"
            variant="ghost"
            class="absolute top-2 right-2 opacity-60 lg:hover:opacity-100"
          />
          <FormPermissionGroup
            :group="item"
            :disabled="disabled"
            @update:group="(g: any) => onNestedGroupUpdate(g, index)"
          />
        </div>
      </template>

      <div v-if="!disabled" class="flex gap-2">
        <UButton
          @click="addPermission"
          icon="lucide:plus"
          size="xs"
          variant="soft"
        >
          Add Permission
        </UButton>
        <UButton
          @click="addGroup"
          icon="lucide:layers"
          size="xs"
          variant="soft"
        >
          Add Group
        </UButton>
      </div>
    </div>

    <FormPermissionEditor
      v-model="showEditModal"
      :permission="editingPermission"
      :disabled="disabled"
      @apply="applyPermissionEdit"
    />
  </div>
</template>

<script setup lang="ts">

const props = defineProps<{
  group: any;
  disabled?: boolean;
  isRoot?: boolean;
}>();

const emit = defineEmits<{
  "update:group": [group: any];
  remove: [];
}>();

const showEditModal = ref(false);
const editingPermission = ref<any>({});
const editingIndex = ref<number>(-1);

function updateGroup() {
  emit("update:group", { ...props.group });
}

function addPermission() {
  const newPermission = {
    id: Math.random().toString(36).substring(2, 9),
    route: "",
    actions: [],
  };
  props.group.conditions.push(newPermission);
  updateGroup();
}

function addGroup() {
  const newGroup = {
    id: Math.random().toString(36).substring(2, 9),
    type: "and",
    conditions: [],
  };
  props.group.conditions.push(newGroup);
  updateGroup();
}

function removeItem(index: number) {
  props.group.conditions.splice(index, 1);
  updateGroup();
}

function onNestedGroupUpdate(group: any, index: number) {
  props.group.conditions[index] = group;
  updateGroup();
}

function isPermission(item: any): boolean {
  return "route" in item;
}

function editPermission(index: number, item: any) {
  editingPermission.value = {
    ...item,
    actions: [...(item.actions || [])],
    allowAll: item.allowAll || false,
  };
  editingIndex.value = index;
  showEditModal.value = true;
}

function applyPermissionEdit(updatedPermission: any) {
  if (editingIndex.value >= 0) {
    props.group.conditions[editingIndex.value] = { ...updatedPermission };
    updateGroup();
  }
}
</script>
