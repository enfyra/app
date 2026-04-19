<script setup lang="ts">
import { FormTableSelect } from '#components';

const props = defineProps<{
  modelValue: any[];
  tableOptions: { label: string; value: any }[];
  reservedNames?: string[];
  tableId?: number | string;
}>();

const notify = useNotify();
const { confirm } = useConfirm();
const { getIdFieldName } = useDatabase();
const relations = useModel(props, "modelValue");

const isEditing = ref(false);
const isNew = ref(false);
const editingIndex = ref<number | null>(null);
const currentRelation = ref<any>(null);
const relationErrors = ref<Record<number, Record<string, string>>>({});

const { generateEmptyForm, validate } = useSchema("relation_definition");
const { isMobile, isTablet } = useScreen();

const showInverseModal = ref(false);
const inverseModalTarget = ref<any>(null);
const inversePropertyNameInput = ref('');

const {
  data: incomingRelData,
  execute: fetchIncomingRelations,
} = useApi(() => "/relation_definition", {
  query: computed(() => ({
    fields: 'id,propertyName,type,sourceTable.id,sourceTable.name,mappedBy.id',
    filter: props.tableId
      ? { targetTable: { [getIdFieldName()]: { _eq: String(props.tableId) } } }
      : { [getIdFieldName()]: { _eq: '__none__' } },
    limit: 100,
  })),
  immediate: false,
  errorContext: 'Fetch Incoming Relations',
});

const incomingRelations = computed(() => {
  if (!incomingRelData.value?.data) return [];
  const existingIds = new Set(
    relations.value
      .filter((r: any) => r.id)
      .map((r: any) => String(r.id)),
  );
  const inverseMappedIds = new Set(
    relations.value
      .filter((r: any) => r.mappedBy?.id)
      .map((r: any) => String(r.mappedBy.id)),
  );
  const pendingMappedByNames = new Set(
    relations.value
      .filter((r: any) => r.mappedBy && typeof r.mappedBy === 'string')
      .map((r: any) => r.mappedBy),
  );
  return incomingRelData.value.data.filter((r: any) => {
    if (r.mappedBy?.id) return false;
    if (existingIds.has(String(r.id))) return false;
    if (inverseMappedIds.has(String(r.id))) return false;
    if (pendingMappedByNames.has(r.propertyName)) return false;
    return true;
  });
});

function isInverseRelation(rel: any): boolean {
  if (rel.mappedBy?.id) return true;
  if (rel.mappedBy && typeof rel.mappedBy === 'string') return true;
  return false;
}

function getInverseType(type: string): string {
  if (type === 'many-to-one') return 'one-to-many';
  if (type === 'one-to-many') return 'many-to-one';
  return type;
}

function openInverseModal(incoming: any) {
  inverseModalTarget.value = incoming;
  inversePropertyNameInput.value = '';
  showInverseModal.value = true;
}

function confirmCreateInverse() {
  const incoming = inverseModalTarget.value;
  if (!incoming || !inversePropertyNameInput.value?.trim()) return;
  const name = inversePropertyNameInput.value.trim();
  if (!TABLE_NAME_FIELD_REGEX.test(name)) {
    notify.error("Invalid name", "Property name must be a valid identifier");
    return;
  }
  const exists = relations.value.some((r: any) => r.propertyName === name);
  if (exists) {
    notify.error("Duplicate", "A relation with this name already exists");
    return;
  }
  const inverseType = getInverseType(incoming.type);
  const sourceTableId = typeof incoming.sourceTable === 'object'
    ? incoming.sourceTable.id
    : incoming.sourceTable;
  relations.value.push({
    propertyName: name,
    type: inverseType,
    targetTable: { id: sourceTableId },
    mappedBy: incoming.propertyName,
    isNullable: true,
    isPublished: true,
  });
  showInverseModal.value = false;
  inverseModalTarget.value = null;
  inversePropertyNameInput.value = '';
}

watch(() => props.tableId, async (id) => {
  if (id) await fetchIncomingRelations();
}, { immediate: true });

const hasFormChanges = ref(false);
const formEditorRef = ref();
const localRelationsWithKeys = computed(() => relations.value.map((r: any, i: number) => ({ ...r, _localKey: i })));
const localSelfKey = computed(() => (editingIndex.value != null ? editingIndex.value : null));

const fieldPermSummaryByRelationId = computed(() => {
  const out: Record<string, { total: number; allow: number; deny: number }> = {};
  for (const rel of relations.value || []) {
    const perms: any[] = Array.isArray(rel.fieldPermissions) ? rel.fieldPermissions : [];
    if (!perms.length) continue;
    const key = String(getId(rel));
    out[key] = { total: perms.length, allow: 0, deny: 0 };
    for (const p of perms) {
      if (String(p?.effect ?? p?.decision ?? "allow") === "deny") out[key].deny += 1;
      else out[key].allow += 1;
    }
  }
  return out;
});

const showPermModal = ref(false);
const permModalTarget = ref<{ id: string; name: string; baseline?: "allow" | "deny" }>({ id: "", name: "" });

function openPermModal(relation: any) {
  permModalTarget.value = { id: String(getId(relation)), name: relation.propertyName || "Unnamed", baseline: relation.isPublished ? "allow" : "deny" };
  showPermModal.value = true;
}

const {
  data: permRefreshData,
  execute: refreshRelationPerms,
} = useApi(() => "/field_permission_definition", {
  query: computed(() => ({
    fields: "id,effect,decision",
    limit: 50,
    filter: permModalTarget.value.id
      ? { relation: { [getIdFieldName()]: { _eq: permModalTarget.value.id } } }
      : { [getIdFieldName()]: { _eq: "__none__" } },
  })),
  immediate: false,
  errorContext: "Refresh Relation Permissions",
})

async function onPermChanged() {
  const targetId = permModalTarget.value.id;
  if (!targetId) return;
  const idx = relations.value.findIndex(r => String(getId(r)) === targetId);
  if (idx === -1) return;
  await refreshRelationPerms();
  const perms = (permRefreshData.value as any)?.data || [];
  relations.value[idx] = { ...relations.value[idx], fieldPermissions: perms };
}


function handleShieldClick(rel: any) {
  if (getId(rel)) {
    openPermModal(rel);
  } else {
    notify.info("Field Permissions", "You can add field permissions after saving the collection.");
  }
}

async function handleDrawerClose() {
  if (!hasFormChanges.value) return;
  isEditing.value = true;
  const ok = await confirm({
    title: "Unsaved Changes",
    content: "You have unsaved changes to this relation. Are you sure you want to close? All changes will be lost.",
    confirmText: "Discard Changes",
    cancelText: "Cancel",
  });
  if (ok) discardChanges();
}

function cancelDrawer() {
  isEditing.value = false;
}

function discardChanges() {
  formEditorRef.value?.confirmChanges();
  relationErrors.value = {};
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

async function saveRelation() {
  const rel = currentRelation.value;
  const index = editingIndex.value ?? relations.value.length;
  const customValidators = {
    propertyName: (value: string) => {
      if (!value?.trim()) return "Relation name is required";
      if (!TABLE_NAME_FIELD_REGEX.test(value.trim())) return "Invalid name";
      const trimmed = value.trim();
      const reserved = (props.reservedNames || [])
        .map((n: any) => String(n ?? '').trim())
        .filter(Boolean);
      if (reserved.includes(trimmed)) return "Field name already exists";
      return null;
    },
  };
  const { isValid, errors } = validate(rel, customValidators);

  if (!isValid) {
    relationErrors.value[index] = errors;
    return;
  }

  const uniqueOk = await formEditorRef.value?.validateAllUniqueFields?.();
  if (uniqueOk === false) {
    return;
  }

  delete relationErrors.value[index];

  const newRel = { ...rel };

  if (isNew.value) {
    relations.value.push(newRel);
  } else if (editingIndex.value != null) {
    relations.value.splice(editingIndex.value, 1, newRel);
  }

  formEditorRef.value?.confirmChanges();

  isEditing.value = false;
  currentRelation.value = null;
}

async function removeRelation(index: number) {
  const rel = relations.value?.[index];
  const displayName = String(rel?.propertyName ?? "Unnamed");
  const ok = await confirm({
    title: "Remove Relation",
    content: `Remove relation "${displayName}"? You can still cancel by discarding changes before saving.`,
  });
  if (!ok) return;
  relations.value.splice(index, 1);
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

        <UBadge v-if="isInverseRelation(rel)" size="xs" variant="soft" color="warning">inverse</UBadge>
        <UBadge size="xs" color="info" v-if="rel.type">{{ rel.type }}</UBadge>
        <UBadge size="xs" color="info" v-if="rel.targetTable || rel.targetTableName">
          →
          {{
            props.tableOptions.find((t) => t.value === rel.targetTable || t.value === (typeof rel.targetTable === 'object' ? rel.targetTable?.id : rel.targetTableName))
              ?.label ?? (typeof rel.targetTable === 'string' ? rel.targetTable : rel.targetTableName ?? 'Unknown')
          }}
        </UBadge>
        <UBadge size="xs" color="info" v-if="rel.isNullable">nullable</UBadge>
        <UBadge
          v-if="fieldPermSummaryByRelationId[String(getId(rel))]?.total"
          size="xs"
          variant="soft"
          color="secondary"
        >
          Perm: {{ fieldPermSummaryByRelationId[String(getId(rel))]?.total }}
        </UBadge>
        <UBadge
          v-if="fieldPermSummaryByRelationId[String(getId(rel))]?.total"
          size="xs"
          variant="soft"
          color="neutral"
        >
          A{{ fieldPermSummaryByRelationId[String(getId(rel))]?.allow }}/D{{ fieldPermSummaryByRelationId[String(getId(rel))]?.deny }}
        </UBadge>
      </div>

      <div class="flex items-center gap-1 mr-2">
        <UTooltip v-if="getId(rel) && !isInverseRelation(rel)" :text="rel.isPublished ? 'Published' : 'Unpublished'">
          <UButton
            :icon="rel.isPublished ? 'lucide:eye' : 'lucide:eye-off'"
            :color="rel.isPublished ? 'success' : 'neutral'"
            variant="ghost"
            size="xs"
            class="lg:hover:cursor-pointer"
            @click.stop="rel.isPublished = !rel.isPublished"
          />
        </UTooltip>
        <UButton
          icon="lucide:shield"
          color="secondary"
          variant="ghost"
          size="xs"
          class="lg:hover:cursor-pointer"
          @click.stop="handleShieldClick(rel)"
        />
        <UButton
          icon="lucide:trash"
          color="error"
          variant="ghost"
          size="xs"
          :disabled="rel.isSystem"
          class="lg:hover:cursor-pointer"
          @click.stop="removeRelation(index)"
        />
      </div>
    </div>

    <div
      v-for="incoming in incomingRelations"
      :key="'incoming-' + incoming.id"
      class="flex items-center justify-between rounded-lg border border-dashed border-muted opacity-60 hover:opacity-100 transition"
    >
      <div class="flex items-center gap-2 flex-1 px-4 py-3">
        <UIcon name="lucide:arrow-down-left" class="w-4 h-4 text-muted-foreground" />
        <span class="text-sm text-muted-foreground">
          {{ incoming.sourceTable?.name ?? 'unknown' }}.{{ incoming.propertyName }}
        </span>
        <UBadge size="xs" variant="soft" color="neutral">{{ incoming.type }}</UBadge>
        <UBadge size="xs" variant="soft" color="neutral">incoming</UBadge>
      </div>
      <UButton
        icon="lucide:plus"
        label="Create Inverse"
        color="primary"
        variant="soft"
        size="xs"
        class="mr-2"
        @click.stop="openInverseModal(incoming)"
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

  <FieldPermissionManageModal
    v-model:open="showPermModal"
    :target-id="permModalTarget.id"
    target-type="relation"
    :target-name="permModalTarget.name"
    :baseline="permModalTarget.baseline"
    @changed="onPermChanged"
  />

  <CommonDrawer
    :handle="false"
    handle-only
    v-model="isEditing"
    direction="right"
    @update:model-value="(open) => { if (!open) handleDrawerClose() }"
  >
    <template #header>
      <div class="flex items-start justify-between gap-3 w-full">
        <div :class="(isMobile || isTablet) ? 'flex items-center gap-2 min-w-0 flex-1' : 'flex items-center gap-3 min-w-0 flex-1'">
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
      </div>
    </template>

      <template #body>
        <div :class="(isMobile || isTablet) ? 'space-y-3' : 'space-y-6'" v-if="currentRelation">
          <div :class="(isMobile || isTablet) ? 'surface-card rounded-lg p-3' : 'surface-card rounded-xl p-6'">
            <div :class="(isMobile || isTablet) ? 'flex items-center gap-1.5 mb-3' : 'flex items-center gap-2 mb-4'">
              <UIcon name="lucide:git-branch" class="text-info" :size="(isMobile || isTablet) ? '16' : '18'" />
              <h3 :class="(isMobile || isTablet) ? 'text-sm font-semibold text-foreground' : 'text-lg font-semibold text-foreground'">
                Relation Properties
              </h3>
            </div>
            <TableInverseRelationInfo
              v-if="isInverseRelation(currentRelation)"
              class="mb-5 md:mb-6"
              :relation="currentRelation"
              :table-options="tableOptions"
            />
            <FormEditorLazy
              ref="formEditorRef"
              v-model="currentRelation"
              v-model:errors="currentRelationErrors"
              tableName="relation_definition"
              @has-changed="(hasChanged) => hasFormChanges = hasChanged"
              unique-check-mode="local"
              :unique-local-records="localRelationsWithKeys"
              :unique-local-self-key="localSelfKey"
              :excluded="isInverseRelation(currentRelation) ? [
                'id', 'createdAt', 'updatedAt', 'isSystem', 'isPublished',
                'sourceTable', 'junctionTableName', 'junctionSourceColumn', 'junctionTargetColumn',
                'type', 'targetTable', 'isNullable', 'isUpdatable', 'mappedBy', 'onDelete', 'metadata',
                'fieldPermissions'
              ] : [
                'id', 'createdAt', 'updatedAt', 'isSystem', 'isPublished',
                'sourceTable', 'junctionTableName', 'junctionSourceColumn', 'junctionTargetColumn',
                'mappedBy',
                'fieldPermissions'
              ]"
              :field-map="{
                type: {
                  type: 'enum',
                  options: relationTypes,
                },
                targetTable: {
                  component: FormTableSelect,
                },
              }"
            />
            <TableInverseToggle
              v-if="!isInverseRelation(currentRelation) && !currentRelation?.id"
              v-model="currentRelation.inversePropertyName"
              class="mt-3"
            />
          </div>
        </div>
      </template>

      <template #footer>

        <div
          :class="(isMobile || isTablet) ? 'surface-card rounded-lg p-3 w-full' : 'surface-card rounded-xl p-4 w-full'"
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
    </CommonDrawer>

    <CommonModal
      v-model="showInverseModal"
      :handle="false"
    >
      <template #title>
        <div class="text-lg font-semibold">Create Inverse Relation</div>
      </template>
      <template #body>
        <div class="space-y-4" v-if="inverseModalTarget">
          <p class="text-sm text-[var(--text-secondary)]">
            Create an inverse for
            <span class="font-semibold text-[var(--text-primary)]">{{ inverseModalTarget.sourceTable?.name }}.{{ inverseModalTarget.propertyName }}</span>
            ({{ inverseModalTarget.type }})
          </p>
          <p class="text-sm text-[var(--text-secondary)]">
            This will create a <span class="font-semibold">{{ getInverseType(inverseModalTarget.type) }}</span> relation on this table.
          </p>
          <UFormField label="Property Name" required class="w-full">
            <UInput
              v-model="inversePropertyNameInput"
              placeholder="e.g. orders, comments, children"
              autofocus
              class="w-full"
              @keydown.enter="confirmCreateInverse"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton variant="ghost" @click="showInverseModal = false">
            Cancel
          </UButton>
          <UButton
            color="primary"
            :disabled="!inversePropertyNameInput?.trim()"
            @click="confirmCreateInverse"
          >
            Create
          </UButton>
        </div>
      </template>
    </CommonModal>

</template>
