<script setup lang="ts">
import { parseConditionJson, validateFieldPermissionCondition } from "~/utils/field-permissions/condition"
import { validateFieldPermissionScope } from "~/utils/field-permissions/scope"
import type { FormEditorVirtualField } from "~/types/form-editor"

type Permission = Record<string, any> & {
  id?: string | number
  _tmpId?: string
}

const props = defineProps<{
  targetType: "column" | "relation"
  targetName: string
  baseline?: "allow" | "deny"
}>()

const open = defineModel<boolean>("open", { required: true })
const permissions = defineModel<Permission[]>("permissions", { required: true })

const notify = useNotify()
const { confirm } = useConfirm()
const { isMobile, isTablet } = useScreen()
const { generateEmptyForm: generateFieldPermEmptyForm } = useSchema("field_permission_definition")

type ViewMode = "list" | "form"
const viewMode = ref<ViewMode>("list")

const fieldPermItems = computed(() => permissions.value || [])

const fieldPermForm = ref<Record<string, any>>({})
const fieldPermErrors = ref<Record<string, string>>({})
const fieldPermMode = ref<"create" | "update">("create")
const editingKey = ref<string | null>(null)

function permKey(p: Permission): string {
  if (p.id != null) return `id:${String(p.id)}`
  if (p._tmpId) return `tmp:${p._tmpId}`
  return `tmp:${Math.random().toString(36).slice(2)}`
}

watch(
  () => [fieldPermForm.value?.role, fieldPermForm.value?.allowedUsers],
  () => {
    const role = fieldPermForm.value?.role
    const users = fieldPermForm.value?.allowedUsers
    const hasRole = role != null && role !== ""
    const hasUser = Array.isArray(users) && users.length > 0
    if (!hasRole && !hasUser) return
    if (!fieldPermErrors.value?.role) return
    const next = { ...(fieldPermErrors.value || {}) }
    delete next.role
    fieldPermErrors.value = next
  },
  { deep: true },
)

function openCreateForm() {
  fieldPermMode.value = "create"
  editingKey.value = null
  const base = generateFieldPermEmptyForm()
  const baseline = props.baseline || "allow"
  const presetEffect = baseline === "allow" ? "deny" : "allow"
  fieldPermForm.value = {
    ...base,
    [props.targetType === "column" ? "relation" : "column"]: null,
    ...(base.effect !== undefined
      ? { effect: presetEffect }
      : base.decision !== undefined
        ? { decision: presetEffect }
        : { effect: presetEffect }),
  }
  fieldPermErrors.value = {}
  viewMode.value = "form"
}

function openEditForm(item: Permission) {
  fieldPermMode.value = "update"
  editingKey.value = permKey(item)
  fieldPermForm.value = JSON.parse(JSON.stringify(item || {}))
  fieldPermErrors.value = {}
  viewMode.value = "form"
}

function cancelForm() {
  viewMode.value = "list"
  fieldPermErrors.value = {}
}

async function quickDeleteFieldPerm(item: Permission) {
  const ok = await confirm({
    title: "Delete Rule",
    content: "Delete this permission rule? Changes apply when you save the table.",
    confirmText: "Delete",
    cancelText: "Cancel",
  })
  if (!ok) return
  const key = permKey(item)
  permissions.value = (permissions.value || []).filter((p) => permKey(p) !== key)
}

function saveFieldPerm() {
  const body: any = { ...fieldPermForm.value }

  const scope = validateFieldPermissionScope(body)
  if (!scope.ok) {
    fieldPermErrors.value = { ...fieldPermErrors.value, role: scope.message }
    notify.error("Validation Error", scope.message)
    return
  }

  if (body?.condition != null && body.condition !== "") {
    const parsed =
      typeof body.condition === "string" ? parseConditionJson(body.condition) : { condition: body.condition, error: null }
    if ((parsed as any).error) {
      notify.error("Validation Error", (parsed as any).error)
      return
    }
    const v = validateFieldPermissionCondition((parsed as any).condition)
    if (!v.ok) {
      notify.error("Validation Error", v.errors[0] || "Invalid condition")
      return
    }
    body.condition = (parsed as any).condition
  } else {
    body.condition = null
  }

  const list = (permissions.value || []).slice()
  if (fieldPermMode.value === "update" && editingKey.value) {
    const idx = list.findIndex((p) => permKey(p) === editingKey.value)
    const existing = idx !== -1 ? list[idx] : null
    if (existing) {
      body.id = existing.id
      if (existing._tmpId) body._tmpId = existing._tmpId
      list[idx] = body
    }
  } else {
    body._tmpId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    list.push(body)
  }
  permissions.value = list
  viewMode.value = "list"
}

function getFieldPermEffect(item: any): string {
  return String(item?.effect ?? item?.decision ?? "allow")
}

function getFieldPermActionsLabel(item: any): string {
  const raw = item?.action ?? item?.actions ?? null
  const actions = Array.isArray(raw) ? raw : raw != null && raw !== "" ? [raw] : []
  return actions.length ? actions.join(", ") : "read"
}

function getFieldPermScopeLabel(item: any): string {
  const users = item?.allowedUsers
  if (Array.isArray(users) && users.length > 0) {
    const u = users[0]
    return u?.email ? String(u.email) : u?.name ? String(u.name) : "User"
  }
  if (item?.role?.name) return `Role: ${item.role.name}`
  return "Scope"
}

const fieldPermissionFormPositions = computed(() => {
  if (fieldPermMode.value === "update") {
    return { action: 1, effect: 2, config: 3 }
  }
  return { action: 0, effect: 1, config: 2 }
})

const fieldPermissionVirtualFields = computed<FormEditorVirtualField[]>(() => [
  { name: "config", fieldType: "relation", label: "Config" },
])

const excludedFields = computed(() => {
  const base = ["allowedUsers", "table", "column", "relation", "role"]
  return base
})

const fieldMap = computed(() => ({
  action: {
    disableUniqueCheck: true,
  },
  actions: {
    disableUniqueCheck: true,
  },
  config: {
    label: "Config",
    disableUniqueCheck: true,
    component: resolveComponent("FormFieldPermissionConfig"),
    componentProps: {
      formData: fieldPermForm.value,
      modelValue: fieldPermForm.value?.role,
      "onUpdate:modelValue": (val: any) => {
        fieldPermForm.value = { ...fieldPermForm.value, role: val }
      },
      onUpdateRole: (role: any) => {
        fieldPermForm.value = { ...fieldPermForm.value, role }
      },
      onUpdateAllowedUsers: (users: any[]) => {
        fieldPermForm.value = { ...fieldPermForm.value, allowedUsers: users }
      },
    },
  },
  condition: {
    type: "code",
    componentProps: {
      language: "json",
      placeholder:
        '{\n  "_and": [\n    { "owner": { "id": { "_eq": "@USER.id" } } }\n  ]\n}',
    },
  },
}))

const conditionText = computed<string>({
  get: () => {
    const v = fieldPermForm.value?.condition
    if (v == null) return ""
    if (typeof v === "string") return v
    try {
      return JSON.stringify(v, null, 2)
    } catch {
      return ""
    }
  },
  set: (value) => {
    fieldPermForm.value.condition = value
  },
})

const conditionParse = computed(() => parseConditionJson(conditionText.value))
const conditionValidation = computed(() => validateFieldPermissionCondition(conditionParse.value.condition))

const conditionErrors = computed(() => {
  const errors: string[] = []
  if (conditionParse.value.error) errors.push(conditionParse.value.error)
  errors.push(...conditionValidation.value.errors)
  return errors
})

const isConditionValid = computed(() => !conditionParse.value.error && conditionValidation.value.ok)

watch(open, (isOpen) => {
  if (isOpen) {
    viewMode.value = "list"
  } else {
    viewMode.value = "list"
  }
})
</script>

<template>
  <CommonModal v-model="open" :handle="false">
    <template #title>
      <div class="flex items-center gap-2">
        <UIcon name="lucide:shield" class="w-5 h-5 text-purple-600 dark:text-purple-400" />
        <span class="text-lg font-semibold">
          {{ viewMode === "form" ? (fieldPermMode === "update" ? "Edit Permission" : "Create Permission") : "Field Permissions" }}
        </span>
      </div>
    </template>

    <template #body>
      <div v-if="viewMode === 'list'" class="space-y-4">
        <div class="text-sm text-[var(--text-tertiary)]">
          {{ targetType === "column" ? "Column" : "Relation" }}: <span class="font-medium text-[var(--text-primary)]">{{ targetName }}</span>
        </div>

        <div
          class="flex gap-3 rounded-lg border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/40 p-3"
        >
          <UIcon
            name="lucide:alert-triangle"
            class="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5"
          />
          <div class="text-sm text-amber-900 dark:text-amber-200">
            <div class="font-semibold mb-1">Changes are staged</div>
            <div class="text-xs">
              Add / edit / delete / toggle here only updates the local form.
              Click <strong>Save</strong> on the table form to persist everything in one atomic request.
              Closing this modal or resetting the table form discards pending changes.
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <div v-if="fieldPermItems.length" class="space-y-2">
            <div
              v-for="it in fieldPermItems"
              :key="permKey(it)"
              class="cursor-pointer transition-colors rounded-lg px-3 border border-[var(--border-default)] hover:bg-[var(--surface-muted)]"
              @click="openEditForm(it)"
            >
              <div class="flex items-start justify-between gap-3 py-3">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <UBadge
                      variant="soft"
                      :color="getFieldPermEffect(it) === 'deny' ? 'error' : 'success'"
                    >
                      {{ getFieldPermEffect(it).toUpperCase() }}
                    </UBadge>
                    <UBadge variant="soft" color="neutral">
                      {{ getFieldPermActionsLabel(it) }}
                    </UBadge>
                    <UBadge variant="soft" color="secondary">
                      {{ getFieldPermScopeLabel(it) }}
                    </UBadge>
                    <UBadge
                      v-if="it?.condition"
                      variant="soft"
                      color="info"
                    >
                      Condition
                    </UBadge>
                  </div>
                  <div
                    v-if="it?.name"
                    class="text-sm font-medium text-[var(--text-primary)] mt-2 truncate"
                  >
                    {{ it.name }}
                  </div>
                  <div v-else class="text-xs text-[var(--text-tertiary)] mt-2">
                    Click to edit this rule.
                  </div>
                </div>

                <UButton
                  icon="lucide:trash-2"
                  variant="ghost"
                  color="error"
                  size="xs"
                  class="rounded-full !aspect-square flex-shrink-0"
                  @click.stop="quickDeleteFieldPerm(it)"
                />
              </div>
            </div>
          </div>

          <CommonEmptyState
            v-else
            title="No rules yet"
            :description="`Create a rule to allow/deny read/create/update for this ${targetType}.`"
            icon="lucide:shield"
            size="sm"
            variant="naked"
          />
        </div>
      </div>

      <div v-else class="space-y-4">
        <FormEditorLazy
          v-model="fieldPermForm"
          v-model:errors="fieldPermErrors"
          table-name="field_permission_definition"
          :field-map="fieldMap"
          :excluded="excludedFields"
          :mode="fieldPermMode"
          :field-positions="fieldPermissionFormPositions"
          :virtual-fields="fieldPermissionVirtualFields"
        />

        <div
          v-if="conditionErrors.length"
          class="rounded-lg border border-[var(--border-default)] bg-[var(--surface-muted)] p-3"
        >
          <div class="text-sm font-medium text-[var(--text-primary)] mb-1">
            Condition validation
          </div>
          <ul class="text-xs text-[var(--text-tertiary)] space-y-1">
            <li v-for="(e, idx) in conditionErrors" :key="idx">
              {{ e }}
            </li>
          </ul>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <template v-if="viewMode === 'list'">
          <UButton variant="ghost" @click="open = false">
            Done
          </UButton>
          <UButton
            icon="lucide:plus"
            @click="openCreateForm"
          >
            Create rule
          </UButton>
        </template>
        <template v-else>
          <UButton variant="ghost" @click="cancelForm">
            Cancel
          </UButton>
          <UButton
            :disabled="!isConditionValid"
            @click="saveFieldPerm"
          >
            {{ fieldPermMode === "update" ? "Update" : "Create" }}
          </UButton>
        </template>
      </div>
    </template>
  </CommonModal>
</template>
