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

function setPattern(v: string) {
  value.value = { ...(value.value || {}), v }
}

function setFlags(f: string) {
  value.value = { ...(value.value || {}), flags: f }
}

function setFormat(v: string) {
  value.value = { v }
}
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

    <div v-else-if="ruleType === 'pattern'" class="space-y-2">
      <div>
        <label class="block text-sm font-medium mb-1">Regex pattern</label>
        <UInput
          :model-value="value?.v ?? ''"
          placeholder="^[a-z]+$"
          class="w-full"
          @update:model-value="setPattern"
        />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Flags (optional)</label>
        <UInput
          :model-value="value?.flags ?? ''"
          placeholder="i"
          class="w-full"
          @update:model-value="setFlags"
        />
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
