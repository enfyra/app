<template>
  <div class="space-y-6">
    <!-- Basic Information Section -->
    <div class="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg p-4">
      <h2 class="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <UIcon name="lucide:info" size="20" class="text-primary" />
        Basic Information
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div 
          v-for="field in basicFields" 
          :key="field.name || field.propertyName"
          class="bg-background/50 rounded-md p-3 border border-muted/30"
        >
          <div class="flex flex-col gap-2">
            <span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {{ field.name || field.propertyName }}
            </span>
            <div class="flex justify-end">
              <RecordDetailsRegularField
                :field="field"
                :value="record[(field.name || field.propertyName) as string]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Relations Section -->
    <div v-if="relationFields.length > 0" class="bg-gradient-to-r from-info/5 to-success/5 rounded-lg p-4">
      <h2 class="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <UIcon name="lucide:git-fork" size="20" class="text-info" />
        Relations
      </h2>
      <div class="space-y-4">
        <div 
          v-for="field in relationFields" 
          :key="field.name || field.propertyName"
          class="bg-background/50 rounded-md p-4 border border-muted/30"
        >
          <div class="flex items-center gap-3 mb-3">
            <h3 class="font-medium text-foreground">
              {{ field.name || field.propertyName }}
            </h3>
            <UBadge 
              variant="soft" 
              size="sm"
              :color="getRelationBadgeColor(field.relationType || '')"
            >
              {{ field.relationType }}
            </UBadge>
          </div>
          <RecordDetailsRelationField
            :field="field"
            :value="record[(field.name || field.propertyName) as string]"
          />
        </div>
      </div>
    </div>

    <!-- Metadata Section -->
    <div v-if="metadataFields.length > 0" class="bg-gradient-to-r from-warning/5 to-error/5 rounded-lg p-4">
      <h2 class="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <UIcon name="lucide:clock" size="20" class="text-warning" />
        Metadata
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div 
          v-for="field in metadataFields" 
          :key="field.name || field.propertyName"
          class="bg-background/50 rounded-md p-3 border border-muted/30"
        >
          <div class="flex flex-col gap-2">
            <span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {{ field.name || field.propertyName }}
            </span>
            <div class="flex justify-end">
              <RecordDetailsRegularField
                :field="field"
                :value="record[(field.name || field.propertyName) as string]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  record: Record<string, any>;
  tableName: string;
}>();

const { definition, sortFieldsByOrder } = useSchema(props.tableName);

const visibleFields = computed(() => {
  let fields = definition.value.filter((field) => {
    const key = field.name || field.propertyName;
    if (!key) return false;
    if (["isSystem", "isRootAdmin"].includes(key)) return false;
    return key in props.record;
  });

  return sortFieldsByOrder(fields);
});

// Separate fields into logical sections
const basicFields = computed(() => {
  return visibleFields.value.filter((field) => {
    const key = field.name || field.propertyName;
    if (field.fieldType === 'relation') return false;
    if (key && ['createdAt', 'updatedAt', 'id'].includes(key)) return false;
    return true;
  });
});

const relationFields = computed(() => {
  return visibleFields.value.filter((field) => field.fieldType === 'relation');
});

const metadataFields = computed(() => {
  return visibleFields.value.filter((field) => {
    const key = field.name || field.propertyName;
    return key ? ['id', 'createdAt', 'updatedAt'].includes(key) : false;
  });
});

function getRelationBadgeColor(relationType: string): "primary" | "secondary" | "success" | "info" | "warning" | "error" | "neutral" {
  switch (relationType) {
    case 'one-to-one': return 'info';
    case 'one-to-many': return 'success';
    case 'many-to-one': return 'warning';
    case 'many-to-many': return 'primary';
    default: return 'neutral';
  }
}

</script>