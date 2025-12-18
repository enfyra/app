<template>
  <div class="text-sm">
    
    <span
      v-if="value === null || value === undefined"
      class="text-muted-foreground italic"
    >
      —
    </span>

    <span
      v-else-if="typeof value === 'boolean'"
      class="inline-flex items-center gap-1"
    >
      <UIcon
        :name="value ? 'lucide:check' : 'lucide:x'"
        :class="value ? 'text-green-500' : 'text-red-500'"
        size="14"
      />
      <span>{{ value ? "True" : "False" }}</span>
    </span>

    <span v-else-if="isDateField" class="inline-flex items-center gap-1">
      <UIcon name="lucide:calendar" class="text-muted-foreground" size="14" />
      <span class="font-mono text-xs">{{ formatDate(value) }}</span>
    </span>

    <span
      v-else-if="field.name === 'id' || field.propertyName === 'id'"
      class="inline-flex items-center gap-1"
    >
      <UIcon name="lucide:hash" class="text-muted-foreground" size="14" />
      <span class="font-mono">{{ value }}</span>
    </span>

    <div v-else-if="Array.isArray(value)" class="space-y-1">
      <UBadge variant="outline" size="sm">{{ value.length }} items</UBadge>
      <div v-if="value.length > 0" class="pl-2 border-l-2 border-muted">
        <div
          v-for="(item, index) in value.slice(0, 5)"
          :key="index"
          class="text-xs font-mono"
        >
          {{ formatValue(item) }}
        </div>
        <div v-if="value.length > 5" class="text-xs text-muted-foreground">
          ... and {{ value.length - 5 }} more
        </div>
      </div>
    </div>

    <div v-else-if="isLongText" class="space-y-2">
      <div class="text-xs text-muted-foreground">
        {{ String(value).length }} characters
      </div>
      <div
        class="p-3 bg-muted/30 rounded border font-mono text-xs whitespace-pre-wrap max-h-32 overflow-y-auto max-w-60 truncate line-clamp-2"
      >
        {{
          collapsed && String(value).length > 200
            ? String(value).substring(0, 200) + "..."
            : value
        }}
      </div>
      <UButton
        v-if="String(value).length > 200"
        variant="ghost"
        size="sm"
        @click="collapsed = !collapsed"
      >
        {{ collapsed ? "Show More" : "Show Less" }}
      </UButton>
    </div>

    <div
      v-else-if="typeof value === 'object'"
      class="p-3 bg-muted/30 rounded border"
    >
      <pre
        class="text-xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto"
        >{{ JSON.stringify(value, null, 2) }}</pre
      >
    </div>

    <span v-else class="inline-flex items-center gap-1">
      <UIcon
        v-if="getFieldIcon"
        :name="getFieldIcon"
        class="text-muted-foreground"
        size="14"
      />
      <span :class="getFieldClass">{{ formatValue(value) }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  field: any;
  value: any;
}>();

const collapsed = ref(true);

const isDateField = computed(() => {
  const fieldName = props.field.name || props.field.propertyName;
  return (
    ["createdAt", "updatedAt"].includes(fieldName) ||
    props.field.type === "datetime" ||
    (typeof props.value === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(props.value))
  );
});

const isLongText = computed(() => {
  return typeof props.value === "string" && props.value.length > 100;
});

const getFieldIcon = computed(() => {
  const fieldName = props.field.name || props.field.propertyName;
  const fieldType = props.field.type;

  if (fieldName === "email") return "lucide:mail";
  if (fieldName === "phone") return "lucide:phone";
  if (fieldName === "url" || fieldName === "website") return "lucide:link";
  if (fieldType === "number" || fieldType === "int") return "lucide:hash";
  if (fieldName.includes("password")) return "lucide:lock";
  if (fieldName.includes("order")) return "lucide:arrow-up-down";

  return null;
});

const getFieldClass = computed(() => {
  const fieldType = props.field.type;

  if (fieldType === "number" || fieldType === "int") {
    return "font-mono";
  }

  return "";
});

function formatDate(value: any): string {
  try {
    const date = new Date(value);
    return date.toLocaleDateString();
  } catch {
    return String(value);
  }
}

function formatValue(value: any): string {
  if (typeof value === "string" && value.length > 50) {
    return value.substring(0, 50) + "...";
  }
  return String(value);
}
</script>
