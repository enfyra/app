<template>
  
  <div
    v-if="!value || (Array.isArray(value) && value.length === 0)"
    class="flex items-center justify-center py-8 bg-muted/10 rounded-lg border-2 border-dashed border-muted/50"
  >
    <div class="text-center">
      <UIcon
        name="lucide:database"
        size="24"
        class="text-muted-foreground/50 mx-auto mb-2"
      />
      <p class="text-sm text-muted-foreground italic">No relations</p>
    </div>
  </div>

  <div v-else-if="Array.isArray(value)" class="space-y-4">
    <div class="flex items-center justify-between">
      <UBadge variant="outline" size="sm" color="info">
        {{ value.length }} {{ value.length === 1 ? "item" : "items" }}
      </UBadge>
      <UButton
        v-if="value.length > maxItems"
        variant="ghost"
        size="sm"
        @click="showAll = !showAll"
        :icon="showAll ? 'lucide:chevron-up' : 'lucide:chevron-down'"
      >
        {{ showAll ? "Show Less" : `Show ${value.length - maxItems} More` }}
      </UButton>
    </div>

    <div class="grid gap-3">
      <div
        v-for="(item, index) in value.slice(
          0,
          showAll ? value.length : maxItems
        )"
        :key="getId(item) || index"
        class="border border-muted/50 rounded-lg p-4 bg-gradient-to-r from-background to-muted/20 lg:hover:shadow-md transition-all duration-200 lg:hover:border-primary/50"
      >
        <RecordDetailsRelationItem :item="item" />
      </div>
    </div>
  </div>

  <div
    v-else-if="typeof value === 'object'"
    class="border border-muted/50 rounded-lg p-4 bg-gradient-to-r from-background to-muted/20 lg:hover:shadow-md transition-all duration-200 lg:hover:border-primary/50"
  >
    <RecordDetailsRelationItem :item="value" />
  </div>

  <div v-else class="text-muted-foreground">
    {{ String(value) }}
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  field: any;
  value: any;
}>();

const { getId } = useDatabase();
const showAll = ref(false);
const maxItems = 3;
</script>
