<script setup lang="ts">
import { useModel } from "#imports";

const props = defineProps<{
  modelValue: any;
  columnNames: string[];
}>();

const table = useModel(props, "modelValue");

function addGroup(list: string[][]) {
  list?.push([""]);
}

function addUniqueGroup() {
  if (!table.value.uniques) table.value.uniques = [];
  table.value.uniques.push([""]);
}

function addIndexGroup() {
  if (!table.value.indexes) table.value.indexes = [];
  table.value.indexes.push([""]);
}
function addFieldToGroup(list: string[][], groupIndex: number) {
  if (!list || !list[groupIndex]) return;
  list[groupIndex].push("");
}
function removeGroup(list: string[][], groupIndex: number) {
  if (!list) return;
  list.splice(groupIndex, 1);
}
</script>

<template>
  <div class="space-y-8">
    
    <div class="space-y-4">
      <div class="flex items-center gap-2 text-lg font-semibold text-muted">
        <UIcon name="lucide:key" class="w-5 h-5" />
        Unique Constraints
        <UButton
          icon="lucide:plus"
          size="sm"
          color="primary"
          @click="addUniqueGroup()"
          :disabled="table.isSystem"
        />
      </div>
      <div
        v-for="(group, gIndex) in table.uniques"
        :key="gIndex"
        class="flex flex-wrap gap-2 items-center"
      >
        <USelectMenu
          v-for="(field, fIndex) in group"
          :key="fIndex"
          :items="props.columnNames.filter((name: string) => group[fIndex] === name || !group.includes(name))"
          v-model="table.uniques[gIndex][fIndex]"
          size="sm"
          class="min-w-[180px] min-h-[28px]"
        />

        <UButton
          icon="lucide:plus"
          size="sm"
          @click="addFieldToGroup(table.uniques, gIndex)"
          :disabled="table.isSystem"
        />
        <UButton
          icon="lucide:trash"
          color="error"
          variant="ghost"
          size="md"
          @click="removeGroup(table.uniques, gIndex)"
          :disabled="table.isSystem"
        />
      </div>
    </div>

    <div class="space-y-4">
      <div class="flex items-center gap-2 text-lg font-semibold text-muted">
        <UIcon name="lucide:list" class="w-5 h-5" />
        Index
        <UButton
          icon="lucide:plus"
          size="sm"
          color="primary"
          @click="addIndexGroup()"
          :disabled="table.isSystem"
        />
      </div>
      <div
        v-for="(group, gIndex) in table.indexes"
        :key="gIndex"
        class="flex flex-wrap gap-2 items-center"
      >
        <USelectMenu
          v-for="(field, fIndex) in group"
          :key="fIndex"
          :items="props.columnNames.filter((name: string) => group[fIndex] === name || !group.includes(name))"
          v-model="table.indexes[gIndex][fIndex]"
          size="sm"
          class="min-w-[180px] min-h-[28px]"
        />

        <UButton
          icon="lucide:plus"
          size="sm"
          @click="addFieldToGroup(table.indexes, gIndex)"
          :disabled="table.isSystem"
        />
        <UButton
          icon="lucide:trash"
          color="error"
          variant="ghost"
          size="md"
          @click="removeGroup(table.indexes, gIndex)"
          :disabled="table.isSystem"
        />
      </div>
    </div>
  </div>
</template>
