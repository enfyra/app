<script setup lang="ts">
const props = defineProps<{
  ruleType: string
}>()

const value = defineModel<any>({ required: true })

const numberLike = computed(() =>
  ["min", "max", "minLength", "maxLength", "minItems", "maxItems"].includes(props.ruleType),
)

const formatOptions = [
  { label: "Email", value: "email" },
  { label: "URL", value: "url" },
  { label: "UUID", value: "uuid" },
  { label: "Datetime (ISO 8601)", value: "datetime" },
]

function setNumber(v: any) {
  const n = Number(v)
  value.value = { v: Number.isNaN(n) ? null : n }
}

function parseRegexInput(input: string): { pattern: string; flags: string } {
  const m = /^\/(.+)\/([gimsuy]*)$/.exec(input)
  if (m) return { pattern: m[1] ?? "", flags: m[2] || "" }
  return { pattern: input, flags: "" }
}

function setPattern(raw: string) {
  const { pattern, flags } = parseRegexInput(String(raw ?? ""))
  value.value = { v: pattern, flags }
}

function setFormat(v: string) {
  value.value = { v }
}

const displayPattern = computed(() => {
  const pat: string = value.value?.v ?? ""
  const flags: string = value.value?.flags ?? ""
  if (!pat) return ""
  return flags ? `/${pat}/${flags}` : pat
})

const compileResult = computed<{ ok: boolean; error: string | null }>(() => {
  const pat = value.value?.v
  const flags = value.value?.flags
  if (!pat) return { ok: false, error: null }
  try {
    new RegExp(pat, flags || undefined)
    return { ok: true, error: null }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Invalid regex" }
  }
})

const matchHint = computed<string | null>(() => {
  const pat: string = value.value?.v
  if (!pat) return null
  const startsAnchored = pat.startsWith("^")
  const endsAnchored = pat.endsWith("$") && !pat.endsWith("\\$")
  if (startsAnchored && endsAnchored)
    return "Whole string must match the pattern (full match)."
  if (startsAnchored)
    return "String must start with the pattern (no `$` anchor at the end)."
  if (endsAnchored)
    return "String must end with the pattern (no `^` anchor at the start)."
  return "Pattern matches anywhere in the string (substring match — no `^...$` anchors). You almost always want to add anchors."
})

const testValue = ref("")
const testResult = ref<{ matched: boolean; checked: boolean; error: string | null }>({
  matched: false,
  checked: false,
  error: null,
})
const validateResult = ref<{ checked: boolean; ok: boolean; error: string | null }>({
  checked: false,
  ok: false,
  error: null,
})

function runValidate() {
  const pat = value.value?.v
  const flags = value.value?.flags
  if (!pat) {
    validateResult.value = { checked: true, ok: false, error: "Pattern is empty." }
    return
  }
  try {
    new RegExp(pat, flags || undefined)
    validateResult.value = { checked: true, ok: true, error: null }
  } catch (e: any) {
    validateResult.value = {
      checked: true,
      ok: false,
      error: e?.message ?? "Invalid regex",
    }
  }
}

function runMatch() {
  const pat = value.value?.v
  const flags = value.value?.flags
  if (!pat) {
    testResult.value = { matched: false, checked: true, error: "Pattern is empty." }
    return
  }
  try {
    const re = new RegExp(pat, flags || undefined)
    testResult.value = {
      matched: re.test(testValue.value),
      checked: true,
      error: null,
    }
  } catch (e: any) {
    testResult.value = {
      matched: false,
      checked: true,
      error: e?.message ?? "Invalid regex",
    }
  }
}

watch(
  () => [value.value?.v, value.value?.flags],
  () => {
    testResult.value = { matched: false, checked: false, error: null }
    validateResult.value = { checked: false, ok: false, error: null }
  },
)
</script>

<template>
  <div>
    <div v-if="numberLike">
      <label class="block text-sm font-medium mb-1">Value</label>
      <UInput
        type="number"
        :model-value="value?.v ?? ''"
        placeholder="0"
        class="w-full"
        @update:model-value="setNumber"
      />
    </div>

    <div v-else-if="ruleType === 'pattern'" class="space-y-3">
      <div>
        <label class="block text-sm font-medium mb-1">Regex pattern</label>
        <UInput
          :model-value="displayPattern"
          placeholder="^[a-z]+$   or   /^[a-z]+$/i"
          class="w-full font-mono"
          @update:model-value="setPattern"
        />
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Write the pattern directly, or wrap it as <code>/pattern/flags</code> to include
          flags (<code>i</code> case-insensitive, <code>m</code> multiline,
          <code>s</code> dotAll, <code>u</code> unicode). Example: <code>/^[a-z]+$/i</code>.
        </p>
      </div>

      <div
        v-if="matchHint"
        class="rounded-md border px-3 py-2 text-xs"
        :class="
          compileResult.ok
            ? 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200'
            : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200'
        "
      >
        <div class="flex items-start gap-2">
          <UIcon
            :name="compileResult.ok ? 'lucide:info' : 'lucide:alert-triangle'"
            class="mt-0.5 size-4 shrink-0"
          />
          <div class="space-y-1">
            <div>{{ matchHint }}</div>
            <div v-if="!compileResult.ok && compileResult.error" class="font-mono">
              {{ compileResult.error }}
            </div>
          </div>
        </div>
      </div>

      <div
        class="rounded-md border border-gray-200 dark:border-gray-800 p-3 space-y-2"
      >
        <div class="text-sm font-medium">Quick test</div>

        <div class="flex flex-wrap items-center gap-2">
          <UButton
            size="xs"
            color="neutral"
            variant="outline"
            icon="lucide:check-circle"
            @click="runValidate"
          >
            Validate regex
          </UButton>
          <span
            v-if="validateResult.checked"
            class="text-xs"
            :class="validateResult.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
          >
            <UIcon
              :name="validateResult.ok ? 'lucide:check' : 'lucide:x'"
              class="inline size-3.5 align-text-bottom"
            />
            {{ validateResult.ok ? "Pattern is valid" : validateResult.error }}
          </span>
        </div>

        <div class="space-y-1">
          <label class="block text-xs font-medium">Test value</label>
          <div class="flex gap-2">
            <UInput
              v-model="testValue"
              placeholder="Type a value to test against..."
              class="flex-1 font-mono"
            />
            <UButton
              size="sm"
              color="primary"
              variant="soft"
              icon="lucide:play"
              @click="runMatch"
            >
              Test
            </UButton>
          </div>
          <div
            v-if="testResult.checked"
            class="text-xs"
          >
            <span
              v-if="testResult.error"
              class="text-red-600 dark:text-red-400"
            >
              <UIcon name="lucide:x" class="inline size-3.5 align-text-bottom" />
              {{ testResult.error }}
            </span>
            <span
              v-else-if="testResult.matched"
              class="text-green-600 dark:text-green-400"
            >
              <UIcon name="lucide:check" class="inline size-3.5 align-text-bottom" />
              Match. This value will PASS validation.
            </span>
            <span v-else class="text-red-600 dark:text-red-400">
              <UIcon name="lucide:x" class="inline size-3.5 align-text-bottom" />
              No match. This value will FAIL validation.
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="ruleType === 'format'">
      <label class="block text-sm font-medium mb-1">Format</label>
      <USelect
        :model-value="value?.v ?? 'email'"
        :items="formatOptions"
        class="w-full"
        @update:model-value="setFormat"
      />
    </div>
  </div>
</template>
