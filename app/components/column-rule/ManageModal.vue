<script setup lang="ts">
type RuleType =
  | "min"
  | "max"
  | "minLength"
  | "maxLength"
  | "pattern"
  | "format"
  | "minItems"
  | "maxItems"

type Rule = {
  id?: string | number
  ruleType: RuleType | string
  value: any
  message: string | null
  isEnabled: boolean
  column?: { id: string | number }
}

const props = defineProps<{
  columnId: string | number
  columnName: string
  columnType: string
}>()

const open = defineModel<boolean>("open", { required: true })

const emit = defineEmits<{ changed: [] }>()

const notify = useNotify()
const { confirm } = useConfirm()
const { getIdFieldName, getId } = useDatabase()

type ViewMode = "list" | "form"
const viewMode = ref<ViewMode>("list")

const {
  data: rulesData,
  pending: rulesLoading,
  execute: fetchRules,
} = useApi(() => "/column_rule_definition", {
  query: computed(() => ({
    fields: "id,ruleType,value,message,isEnabled,column.id",
    sort: "id",
    limit: 100,
    filter: {
      column: { [getIdFieldName()]: { _eq: String(props.columnId) } },
    },
  })),
  immediate: false,
  errorContext: "Fetch Column Rules",
})

const rules = computed<Rule[]>(() => (rulesData.value as any)?.data || [])

const form = ref<Rule>({
  ruleType: "min",
  value: null,
  message: null,
  isEnabled: true,
})
const editingId = ref<string | null>(null)
const mode = ref<"create" | "update">("create")
const saving = ref(false)
const deletingId = ref<string | null>(null)

const { execute: createRule, pending: creating, error: createErr } = useApi(
  () => "/column_rule_definition",
  { method: "post", errorContext: "Create Column Rule", immediate: false, watch: false },
)
const { execute: patchRule, pending: patching, error: patchErr } = useApi(
  () => `/column_rule_definition/${editingId.value || ""}`,
  { method: "patch", errorContext: "Update Column Rule", immediate: false, watch: false },
)
const { execute: deleteRule, pending: deleting, error: deleteErr } = useApi(
  () => "/column_rule_definition",
  { method: "delete", errorContext: "Delete Column Rule", immediate: false, watch: false },
)

const isBusy = computed(
  () => saving.value || creating.value || patching.value || deleting.value,
)

// ruleType options filtered by column type
const ALL_RULE_TYPES: { value: RuleType; label: string; desc: string }[] = [
  { value: "min", label: "Min (number)", desc: "Minimum numeric value" },
  { value: "max", label: "Max (number)", desc: "Maximum numeric value" },
  { value: "minLength", label: "Min length (string)", desc: "Minimum string length" },
  { value: "maxLength", label: "Max length (string)", desc: "Maximum string length" },
  { value: "pattern", label: "Pattern (regex)", desc: "Regex pattern match" },
  { value: "format", label: "Format", desc: "Predefined format (email, url, uuid, datetime)" },
  { value: "minItems", label: "Min items (array)", desc: "Minimum array length" },
  { value: "maxItems", label: "Max items (array)", desc: "Maximum array length" },
]

const numberTypes = ["int", "bigint", "float", "decimal"]
const stringTypes = ["varchar", "text", "richtext", "code", "uuid"]
const arrayTypes = ["array-select"]

function typesForColumn(colType: string): RuleType[] {
  if (numberTypes.includes(colType)) return ["min", "max"]
  if (stringTypes.includes(colType)) return ["minLength", "maxLength", "pattern", "format"]
  if (arrayTypes.includes(colType)) return ["minItems", "maxItems"]
  return []
}

const usedRuleTypes = computed(() => {
  const used = new Set<string>()
  for (const r of rules.value) {
    if (r.ruleType === "custom") continue
    if (mode.value === "update" && editingId.value && String(getId(r)) === editingId.value) continue
    used.add(r.ruleType)
  }
  return used
})

const availableRuleTypes = computed(() => {
  const allowed = typesForColumn(props.columnType)
  return ALL_RULE_TYPES.filter((rt) => allowed.includes(rt.value)).map((rt) => ({
    ...rt,
    disabled: usedRuleTypes.value.has(rt.value),
  }))
})

function openCreateForm() {
  mode.value = "create"
  editingId.value = null
  const firstAvailable = availableRuleTypes.value.find((rt) => !rt.disabled)
  if (!firstAvailable) {
    notify.info("No rules available", "This column type has no applicable validation rules.")
    return
  }
  form.value = {
    ruleType: firstAvailable.value,
    value: defaultValueFor(firstAvailable.value),
    message: null,
    isEnabled: true,
  }
  viewMode.value = "form"
}

function openEditForm(item: Rule) {
  if (isBusy.value) return
  mode.value = "update"
  editingId.value = String(getId(item))
  form.value = JSON.parse(JSON.stringify(item))
  viewMode.value = "form"
}

function cancelForm() {
  viewMode.value = "list"
}

function defaultValueFor(ruleType: string): any {
  switch (ruleType) {
    case "min":
    case "max":
    case "minLength":
    case "maxLength":
    case "minItems":
    case "maxItems":
      return { v: 0 }
    case "pattern":
      return { v: "", flags: "" }
    case "format":
      return { v: "email" }
    default:
      return null
  }
}

watch(
  () => form.value.ruleType,
  (next, prev) => {
    if (next !== prev) form.value.value = defaultValueFor(String(next))
  },
)

async function toggleEnabled(item: Rule) {
  if (isBusy.value) return
  const id = String(getId(item))
  editingId.value = id
  try {
    await patchRule({ body: { isEnabled: !item.isEnabled } })
    if (patchErr.value) {
      notify.error("Error", "Failed to toggle rule")
      return
    }
    await fetchRules()
    emit("changed")
  } finally {
    editingId.value = null
  }
}

async function quickDelete(item: Rule) {
  if (isBusy.value) return
  const id = String(getId(item))
  const ok = await confirm({
    title: "Delete Rule",
    content: `Delete rule "${item.ruleType}"? This cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Cancel",
  })
  if (!ok) return
  deletingId.value = id
  try {
    await deleteRule({ id })
    if (deleteErr.value) return
    notify.success("Rule deleted")
    await fetchRules()
    emit("changed")
  } finally {
    if (deletingId.value === id) deletingId.value = null
  }
}

function validateForm(): string | null {
  const rt = form.value.ruleType
  if (!rt) return "Rule type is required"
  if (["min", "max", "minLength", "maxLength", "minItems", "maxItems"].includes(String(rt))) {
    const v = form.value.value?.v
    if (typeof v !== "number" || Number.isNaN(v)) return "Value must be a number"
  }
  if (rt === "pattern") {
    const p = form.value.value?.v
    if (!p || typeof p !== "string") return "Pattern regex is required"
    try {
      new RegExp(p, form.value.value?.flags)
    } catch {
      return "Invalid regex pattern"
    }
  }
  if (rt === "format") {
    const v = form.value.value?.v
    if (!["email", "url", "uuid", "datetime"].includes(v)) return "Invalid format"
  }
  return null
}

async function saveRule() {
  if (isBusy.value) return
  const err = validateForm()
  if (err) {
    notify.error("Validation Error", err)
    return
  }
  saving.value = true
  try {
    const body: any = {
      ruleType: form.value.ruleType,
      value: form.value.value,
      message: form.value.message || null,
      isEnabled: form.value.isEnabled !== false,
      column: { id: String(props.columnId) },
    }
    if (mode.value === "update" && editingId.value) {
      await patchRule({ body })
      if (patchErr.value) return
      notify.success("Rule updated")
    } else {
      await createRule({ body })
      if (createErr.value) return
      notify.success("Rule created")
    }
    viewMode.value = "list"
    await fetchRules()
    emit("changed")
  } finally {
    saving.value = false
  }
}

function ruleSummary(r: Rule): string {
  switch (r.ruleType) {
    case "min":
    case "max":
    case "minLength":
    case "maxLength":
    case "minItems":
    case "maxItems":
      return `${r.ruleType}: ${r.value?.v ?? "?"}`
    case "pattern":
      return `pattern: /${r.value?.v ?? ""}/${r.value?.flags ?? ""}`
    case "format":
      return `format: ${r.value?.v ?? "?"}`
    case "custom":
      return "custom script"
    default:
      return String(r.ruleType)
  }
}

watch(open, async (isOpen) => {
  if (isOpen) {
    viewMode.value = "list"
    if (props.columnId) await fetchRules()
  }
})
</script>

<template>
  <CommonModal v-model="open" :handle="false">
    <template #title>
      <div class="flex items-center gap-2">
        <UIcon name="lucide:ruler" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <span class="text-lg font-semibold">
          {{
            viewMode === "form"
              ? mode === "update"
                ? "Edit Rule"
                : "Create Rule"
              : "Validation Rules"
          }}
        </span>
      </div>
    </template>

    <template #body>
      <div v-if="viewMode === 'list'" class="space-y-4">
        <div class="text-sm text-[var(--text-tertiary)]">
          Column:
          <span class="font-medium text-[var(--text-primary)]">{{ columnName }}</span>
          <UBadge variant="soft" color="neutral" class="ml-2">{{ columnType }}</UBadge>
        </div>

        <div
          class="flex gap-3 rounded-lg border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/40 p-3"
        >
          <UIcon
            name="lucide:alert-triangle"
            class="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5"
          />
          <div class="text-sm text-amber-900 dark:text-amber-200">
            <div class="font-semibold mb-1">How rules apply</div>
            <div class="text-xs">
              Rules are <strong>added on top</strong> of the column's type and required check — never replace them.
              Example: <code class="font-mono">min: 10</code> on an <code class="font-mono">int</code> column still requires a number, still respects <code class="font-mono">isNullable</code>, and additionally enforces ≥ 10.
            </div>
          </div>
        </div>

        <CommonLoadingState
          v-if="rulesLoading"
          title="Loading rules..."
          size="sm"
          type="form"
          context="inline"
        />

        <div v-else class="space-y-2">
          <div v-if="rules.length" class="space-y-2">
            <div
              v-for="r in rules"
              :key="`rule-${String(getId(r) ?? '')}`"
              class="rounded-lg border border-[var(--border-default)] overflow-hidden"
            >
              <div
                class="cursor-pointer transition-colors px-3 py-3 hover:bg-[var(--surface-muted)]"
                @click="openEditForm(r)"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <UBadge variant="soft" color="info">
                        {{ r.ruleType }}
                      </UBadge>
                      <span class="text-sm text-[var(--text-primary)] truncate">
                        {{ ruleSummary(r) }}
                      </span>
                    </div>
                    <div
                      v-if="r.message"
                      class="text-xs text-[var(--text-tertiary)] mt-1 truncate"
                    >
                      Message: {{ r.message }}
                    </div>
                  </div>
                  <UButton
                    icon="lucide:trash-2"
                    variant="ghost"
                    color="error"
                    size="xs"
                    class="rounded-full !aspect-square flex-shrink-0"
                    :loading="String(getId(r)) === deletingId"
                    :disabled="isBusy"
                    @click.stop="quickDelete(r)"
                  />
                </div>
              </div>

              <div
                class="flex items-center justify-between px-3 py-2.5 border-t border-[var(--border-default)] bg-[var(--surface-subtle)]"
              >
                <span class="text-sm text-[var(--text-primary)]">Enabled</span>
                <USwitch
                  :model-value="r.isEnabled"
                  :disabled="isBusy"
                  @update:model-value="toggleEnabled(r)"
                  @click.stop
                />
              </div>
            </div>
          </div>

          <CommonEmptyState
            v-else
            title="No rules yet"
            description="Add validation rules like required, min/max, pattern, format."
            icon="lucide:ruler"
            size="sm"
            variant="naked"
          />
        </div>
      </div>

      <div v-else class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Rule type</label>
          <USelect
            v-model="form.ruleType"
            :items="availableRuleTypes.map(rt => ({ label: rt.label, value: rt.value, disabled: rt.disabled }))"
            class="w-full"
            :disabled="mode === 'update'"
          />
        </div>

        <ColumnRuleValueEditor
          v-if="form.ruleType !== 'custom'"
          v-model="form.value"
          :rule-type="form.ruleType"
        />

        <div>
          <label class="block text-sm font-medium mb-1">
            Custom error message (optional)
          </label>
          <UInput v-model="form.message" placeholder="e.g. 'Email is invalid'" class="w-full" />
        </div>

        <div class="flex items-center gap-2">
          <USwitch v-model="form.isEnabled" />
          <span class="text-sm">Enabled</span>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <template v-if="viewMode === 'list'">
          <UButton variant="ghost" @click="open = false">Close</UButton>
          <UButton icon="lucide:plus" @click="openCreateForm">Add rule</UButton>
        </template>
        <template v-else>
          <UButton variant="ghost" @click="cancelForm">Cancel</UButton>
          <UButton :loading="saving" :disabled="saving" @click="saveRule">
            {{ mode === "update" ? "Update" : "Create" }}
          </UButton>
        </template>
      </div>
    </template>
  </CommonModal>
</template>
