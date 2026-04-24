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
  _tmpId?: string
  ruleType: string
  value: any
  message: string | null
  isEnabled: boolean
}

const props = defineProps<{
  columnName: string
  columnType: string
}>()

const open = defineModel<boolean>("open", { required: true })
const rules = defineModel<Rule[]>("rules", { required: true })

const notify = useNotify()
const { confirm } = useConfirm()
const { getId } = useDatabase()

type ViewMode = "list" | "form"
const viewMode = ref<ViewMode>("list")

const form = ref<Rule>({
  ruleType: "min",
  value: null,
  message: null,
  isEnabled: true,
})
const editingKey = ref<string | null>(null)
const mode = ref<"create" | "update">("create")

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

function ruleKey(r: Rule): string {
  if (r.id != null) return `id:${String(r.id)}`
  if (r._tmpId) return `tmp:${r._tmpId}`
  return `tmp:${Math.random().toString(36).slice(2)}`
}

const usedRuleTypes = computed(() => {
  const used = new Set<string>()
  for (const r of rules.value || []) {
    if (r.ruleType === "custom") continue
    if (mode.value === "update" && editingKey.value && ruleKey(r) === editingKey.value) continue
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

function openCreateForm() {
  mode.value = "create"
  editingKey.value = null
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
  mode.value = "update"
  editingKey.value = ruleKey(item)
  form.value = JSON.parse(JSON.stringify(item))
  viewMode.value = "form"
}

function cancelForm() {
  viewMode.value = "list"
}

watch(
  () => form.value.ruleType,
  (next, prev) => {
    if (next !== prev) form.value.value = defaultValueFor(String(next))
  },
)

function toggleEnabled(item: Rule) {
  const list = (rules.value || []).slice()
  const key = ruleKey(item)
  const idx = list.findIndex((r) => ruleKey(r) === key)
  if (idx === -1) return
  const existing = list[idx]!
  list[idx] = { ...existing, isEnabled: !existing.isEnabled }
  rules.value = list
}

async function quickDelete(item: Rule) {
  const ok = await confirm({
    title: "Delete Rule",
    content: `Delete rule "${item.ruleType}"? Changes apply when you save the table.`,
    confirmText: "Delete",
    cancelText: "Cancel",
  })
  if (!ok) return
  const key = ruleKey(item)
  rules.value = (rules.value || []).filter((r) => ruleKey(r) !== key)
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

function saveRule() {
  const err = validateForm()
  if (err) {
    notify.error("Validation Error", err)
    return
  }
  const next: Rule = {
    ruleType: form.value.ruleType,
    value: form.value.value,
    message: form.value.message || null,
    isEnabled: form.value.isEnabled !== false,
  }
  const list = (rules.value || []).slice()
  if (mode.value === "update" && editingKey.value) {
    const idx = list.findIndex((r) => ruleKey(r) === editingKey.value)
    const existing = idx !== -1 ? list[idx] : null
    if (existing) {
      next.id = existing.id
      next._tmpId = existing._tmpId
      list[idx] = next
    }
  } else {
    next._tmpId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    list.push(next)
  }
  rules.value = list
  viewMode.value = "list"
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

watch(open, (isOpen) => {
  if (isOpen) viewMode.value = "list"
})
</script>

<template>
  <CommonModal v-model="open" :handle="false">
    <template #title>
      <div class="flex items-center gap-2">
        <UButton
          v-if="viewMode === 'form'"
          icon="lucide:arrow-left"
          variant="ghost"
          color="neutral"
          size="sm"
          class="rounded-full !aspect-square -ml-1"
          @click="cancelForm"
        />
        <UIcon
          v-else
          name="lucide:ruler"
          class="w-5 h-5 text-blue-600 dark:text-blue-400"
        />
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
              Changes are staged here and persist when you save the table.
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <div v-if="(rules || []).length" class="space-y-2">
            <div
              v-for="r in rules"
              :key="ruleKey(r)"
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
                  @update:model-value="toggleEnabled(r)"
                  @click.stop
                />
              </div>
            </div>
          </div>

          <CommonEmptyState
            v-else
            title="No rules yet"
            description="Add validation rules like min/max, pattern, format."
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
            :model-value="form.ruleType as RuleType"
            :items="availableRuleTypes.map(rt => ({ label: rt.label, value: rt.value, disabled: rt.disabled }))"
            class="w-full"
            :disabled="mode === 'update'"
            @update:model-value="(v: any) => (form.ruleType = v)"
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
          <UInput
            :model-value="form.message ?? ''"
            placeholder="e.g. 'Email is invalid'"
            class="w-full"
            @update:model-value="(v) => (form.message = (v as string) || null)"
          />
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
          <UButton variant="ghost" @click="open = false">Done</UButton>
          <UButton icon="lucide:plus" @click="openCreateForm">Add rule</UButton>
        </template>
        <template v-else>
          <UButton @click="saveRule">
            {{ mode === "update" ? "Update" : "Create" }}
          </UButton>
        </template>
      </div>
    </template>
  </CommonModal>
</template>
