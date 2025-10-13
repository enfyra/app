<template>
  <div class="space-y-3">
    <!-- Primary Info Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <UIcon name="lucide:box" size="16" class="text-primary" />
        </div>
        <div>
          <h4 class="font-semibold text-sm text-foreground">
            {{ getPrimaryLabel(item) }}
          </h4>
          <UBadge variant="outline" size="xs" color="neutral" class="mt-1">
            ID: {{ getId(item) }}
          </UBadge>
        </div>
      </div>
      
      <UButton
        v-if="hasMoreFields"
        variant="ghost"
        size="sm"
        @click="expanded = !expanded"
        :icon="expanded ? 'lucide:chevron-up' : 'lucide:chevron-down'"
        class="shrink-0"
      >
        {{ expanded ? 'Less' : 'More' }}
      </UButton>
    </div>

    <!-- Key Fields (always shown) -->
    <div v-if="keyFields.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <div 
        v-for="[key, value] in keyFields" 
        :key="key"
        class="bg-muted/20 rounded px-3 py-2"
      >
        <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
          {{ key }}
        </div>
        <div class="text-sm font-mono text-foreground">
          {{ formatValue(value) }}
        </div>
      </div>
    </div>

    <!-- Additional Fields (expandable) -->
    <div v-if="expanded && additionalFields.length > 0" class="border-t border-muted/50 pt-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div 
          v-for="[key, value] in additionalFields" 
          :key="key"
          class="bg-muted/10 rounded px-3 py-2"
        >
          <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            {{ key }}
          </div>
          <div class="text-sm font-mono text-foreground">
            {{ formatValue(value) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  item: any;
}>();

const { getId } = useDatabase();
const expanded = ref(false);

// Priority fields that should be shown first
const priorityFields = ['name', 'title', 'label', 'email', 'type', 'status', 'description'];

// Fields to exclude from display
const excludedFields = ['id', '_id', 'createdAt', 'updatedAt', 'isSystem', 'isRootAdmin'];

const keyFields = computed(() => {
  const fields: [string, any][] = [];
  
  // Add priority fields first
  for (const field of priorityFields) {
    if (field in props.item && props.item[field] !== null && props.item[field] !== undefined) {
      const value = props.item[field];
      if (typeof value !== 'object') {
        fields.push([field, value]);
      }
    }
  }
  
  // Limit to 3 key fields
  return fields.slice(0, 3);
});

const additionalFields = computed(() => {
  const fields: [string, any][] = [];
  const usedKeys = new Set([...keyFields.value.map(([key]) => key), ...excludedFields]);
  
  Object.entries(props.item).forEach(([key, value]) => {
    if (!usedKeys.has(key) && value !== null && value !== undefined) {
      // Skip nested objects/relations
      if (typeof value !== 'object') {
        fields.push([key, value]);
      }
    }
  });
  
  return fields;
});

const hasMoreFields = computed(() => additionalFields.value.length > 0);

function getPrimaryLabel(item: any): string {
  // Try to find the most meaningful label
  for (const field of ['name', 'title', 'label', 'email']) {
    if (item[field]) {
      return String(item[field]);
    }
  }
  
  // Fallback to type or first available string field
  for (const [key, value] of Object.entries(item)) {
    if (typeof value === 'string' && value.length > 0 && !excludedFields.includes(key)) {
      return String(value);
    }
  }
  
  return 'Record';
}

function formatValue(value: any): string {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  
  if (typeof value === 'string' && value.length > 30) {
    return value.substring(0, 30) + '...';
  }
  
  return String(value);
}
</script>