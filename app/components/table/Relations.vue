<script setup lang="ts">
import { useModel } from "#imports";

const props = defineProps<{
  modelValue: any[];
  tableOptions: { label: string; value: any }[];
}>();

const relations = useModel(props, "modelValue");

const isEditing = ref(false);
const isNew = ref(false);
const editingIndex = ref<number | null>(null);
const currentRelation = ref<any>(null);
const relationErrors = ref<Record<number, Record<string, string>>>({});

const { generateEmptyForm, validate } = useSchema("relation_definition");
const { isMobile, isTablet } = useScreen();

const showCloseConfirm = ref(false);
const hasFormChanges = ref(false);
const formEditorRef = ref();

// Handle drawer close
function handleDrawerClose() {
  // Check if there are unsaved changes
  if (hasFormChanges.value) {
    showCloseConfirm.value = true;
    // Reopen drawer to show modal
    isEditing.value = true;
  }
}

function cancelDrawer() {
  isEditing.value = false;
}

function discardChanges() {
  // Reset form changes
  formEditorRef.value?.confirmChanges();
  // Reset errors
  relationErrors.value = {};
  showCloseConfirm.value = false;
  isEditing.value = false;
  isNew.value = false;
  currentRelation.value = null;
  editingIndex.value = null;
}

function createEmptyRelation(): any {
  return generateEmptyForm();
}

const currentRelationErrors = computed({
  get: () =>
    relationErrors.value[editingIndex.value ?? relations.value.length] || {},
  set: (val) => {
    relationErrors.value[editingIndex.value ?? relations.value.length] = val;
  },
});

function openNewRelationModal() {
  isEditing.value = true;
  isNew.value = true;
  editingIndex.value = null;
  currentRelation.value = createEmptyRelation();
}

function editRelation(rel: any, index: number) {
  isEditing.value = true;
  isNew.value = false;
  editingIndex.value = index;
  currentRelation.value = { ...toRaw(rel) };
}

function saveRelation() {
  const rel = currentRelation.value;
  const index = editingIndex.value ?? relations.value.length;
  const { isValid, errors } = validate(rel);

  if (!isValid) {
    relationErrors.value[index] = errors;
    return;
  }

  delete relationErrors.value[index];

  const newRel = { ...rel };

  if (isNew.value) {
    relations.value.push(newRel);
  } else if (editingIndex.value != null) {
    relations.value.splice(editingIndex.value, 1, newRel);
  }

  // Reset form changes before closing
  formEditorRef.value?.confirmChanges();

  isEditing.value = false;
  currentRelation.value = null;
}
</script>

<template>
  <div class="space-y-2 mt-6">
    <div class="flex items-center gap-2 text-lg font-semibold text-muted">
      <UIcon name="lucide:git-branch" class="w-5 h-5" />
      Relations
    </div>

    <div
      v-for="(rel, index) in relations"
      :key="rel.id ?? index"
      class="flex items-center justify-between rounded-lg border border-muted lg:hover:bg-muted/50 transition"
    >
      <div
        class="flex items-center gap-2 flex-1 cursor-pointer px-4 py-3"
        @click="editRelation(rel, index)"
      >
        <UIcon name="lucide:link" class="w-4 h-4 text-muted-foreground" />
        <span class="text-sm font-medium">
          {{ rel.propertyName || "Unnamed" }}
        </span>

        <UBadge size="xs" color="info" v-if="rel.type">{{ rel.type }}</UBadge>
        <UBadge size="xs" color="info" v-if="rel.targetTable">
          →
          {{
            props.tableOptions.find((t) => t.value === rel.targetTable)
              ?.label ?? rel.targetTable.id
          }}
        </UBadge>
        <UBadge size="xs" color="info" v-if="rel.isNullable">nullable</UBadge>
      </div>

      <UButton
        icon="lucide:trash"
        color="error"
        variant="ghost"
        size="xs"
        :disabled="rel.isSystem"
        class="lg:hover:cursor-pointer mr-2"
        @click.stop="relations.splice(index, 1)"
      />
    </div>

    <div class="flex justify-end pt-2">
      <UButton
        icon="lucide:plus"
        label="Add Relation"
        @click.stop="openNewRelationModal()"
        class="relative z-10"
        color="primary"
        variant="solid"
        :size="(isMobile || isTablet) ? 'sm' : 'md'"
      />
    </div>
  </div>

  <!-- Edit Relation Drawer -->
  <Teleport to="body">
    <UDrawer
      :handle="false"
      handle-only
      v-model:open="isEditing"
      direction="right"
      :class="(isMobile || isTablet) ? 'w-full max-w-full' : 'min-w-xl max-w-xl'"
      @update:open="(open) => { if (!open) handleDrawerClose() }"
      :ui="{
        header:
          'border-b border-muted text-muted pb-2 flex items-center justify-between',
      }"
    >
      <template #header>
        <div
          class="bg-gradient-to-r from-background/90 to-muted/20 rounded-t-xl w-full"
        >
          <div class="flex items-center justify-between w-full">
            <div :class="(isMobile || isTablet) ? 'flex items-center gap-2 min-w-0 flex-1' : 'flex items-center gap-3'">
              <div
                :class="(isMobile || isTablet) ? 'w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg flex-shrink-0' : 'w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg'"
              >
                <UIcon name="lucide:git-branch" :class="(isMobile || isTablet) ? 'text-xs text-white' : 'text-sm text-white'" />
              </div>
              <div class="min-w-0 flex-1">
                <h2 :class="(isMobile || isTablet) ? 'text-base font-semibold text-foreground truncate' : 'text-xl font-semibold text-foreground'">
                  {{ isNew ? "Add Relation" : "Edit Relation" }}
                </h2>
                <p :class="(isMobile || isTablet) ? 'text-xs text-muted-foreground truncate' : 'text-sm text-muted-foreground'">
                  {{
                    currentRelation?.propertyName ||
                    "Configure relation properties"
                  }}
                </p>
              </div>
            </div>
            <UButton
              icon="lucide:x"
              @click="isEditing = false"
              variant="soft"
              color="error"
              :size="(isMobile || isTablet) ? 'sm' : 'lg'"
              :class="(isMobile || isTablet) ? 'rounded-full !aspect-square flex-shrink-0' : 'lg:hover:bg-error/10 lg:hover:text-error transition-colors duration-200'"
            />
          </div>
        </div>
      </template>

      <template #body>
        <div :class="(isMobile || isTablet) ? 'space-y-3' : 'space-y-6'" v-if="currentRelation">
          <div :class="(isMobile || isTablet) ? 'bg-gray-800/50 rounded-lg border border-muted/30 p-3' : 'bg-gray-800/50 rounded-xl border border-muted/30 p-6'">
            <div :class="(isMobile || isTablet) ? 'flex items-center gap-1.5 mb-3' : 'flex items-center gap-2 mb-4'">
              <UIcon name="lucide:git-branch" class="text-info" :size="(isMobile || isTablet) ? '16' : '18'" />
              <h3 :class="(isMobile || isTablet) ? 'text-sm font-semibold text-foreground' : 'text-lg font-semibold text-foreground'">
                Relation Properties
              </h3>
            </div>
            <FormEditorLazy
              ref="formEditorRef"
              v-model="currentRelation"
              v-model:errors="currentRelationErrors"
              tableName="relation_definition"
              @has-changed="(hasChanged) => hasFormChanges = hasChanged"
              :excluded="[
                'id',
                'createdAt',
                'updatedAt',
                'isSystem',
              
                'sourceTable',
                'junctionTableName',
                'junctionSourceColumn',
                'junctionTargetColumn'
              ]"
              :type-map="{
                type: {
                  type: 'enum',
                  options: relationTypes,
                },
              }"
            />
          </div>
        </div>
      </template>

      <template #footer>
        <!-- Actions Section -->
        <div
          :class="(isMobile || isTablet) ? 'bg-gray-800/50 rounded-lg border border-muted/30 p-3 w-full' : 'bg-gray-800/50 rounded-xl border border-muted/30 p-4 w-full'"
        >
          <div class="flex items-center justify-between w-full">
            <div v-if="!isMobile && !isTablet" class="flex items-center gap-2">
              <UIcon
                name="lucide:info"
                class="text-muted-foreground"
                size="16"
              />
              <span class="text-sm text-muted-foreground">
                {{
                  isNew
                    ? "Ready to create new relation?"
                    : "Ready to update relation?"
                }}
              </span>
            </div>
            <div :class="(isMobile || isTablet) ? 'flex gap-1.5 w-full justify-end' : 'flex gap-3'">
              <UButton
                variant="ghost"
                color="neutral"
                @click="cancelDrawer"
                :disabled="false"
                :size="(isMobile || isTablet) ? 'sm' : 'md'"
                :icon="(isMobile || isTablet) ? 'lucide:x' : undefined"
                :class="(isMobile || isTablet) ? 'rounded-full !aspect-square' : ''"
              >
                <span v-if="!isMobile && !isTablet">Cancel</span>
              </UButton>
              <UButton
                icon="lucide:check"
                @click="saveRelation()"
                color="primary"
                :loading="false"
                :size="(isMobile || isTablet) ? 'sm' : 'md'"
                :class="(isMobile || isTablet) ? 'rounded-full !aspect-square' : ''"
              >
                <span v-if="!isMobile && !isTablet">{{ isNew ? "Create Relation" : "Update Relation" }}</span>
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UDrawer>

    <!-- Close Confirmation Modal -->
    <UModal 
      v-model:open="showCloseConfirm" 
      :handle="false"
      :close="{
        color: 'error',
        variant: 'solid',
        size: 'lg',
      }"
    >
      <template #title>
        <div class="text-lg font-semibold">Unsaved Changes</div>
      </template>
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-gray-300 text-center">
            You have unsaved changes to this relation. Are you sure you want to close? All changes will be lost.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton variant="ghost" @click="showCloseConfirm = false">
            Cancel
          </UButton>
          <UButton @click="discardChanges">
            Discard Changes
          </UButton>
        </div>
      </template>
    </UModal>
  </Teleport>
</template>
