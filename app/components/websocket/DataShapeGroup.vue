<script setup lang="ts">
import type { WebsocketEventDataShapeField } from '../../types/websocket-event-data-shape';

const props = defineProps<{
  modelValue: WebsocketEventDataShapeField[];
  level?: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: WebsocketEventDataShapeField[]];
}>();

const typeItems = getWebsocketEventDataShapeTypeItems();
const arrayItemTypeItems = getWebsocketEventArrayItemTypeItems();

const fields = computed(() => props.modelValue || []);
const currentLevel = computed(() => props.level || 0);

function updateFields(next: WebsocketEventDataShapeField[]) {
  emit('update:modelValue', next);
}

function addField() {
  updateFields([...fields.value, createWebsocketEventDataShapeField()]);
}

function addGroup() {
  updateFields([
    ...fields.value,
    createWebsocketEventDataShapeField({
      name: '',
      type: 'object',
      children: [createWebsocketEventDataShapeField()],
    }),
  ]);
}

function updateField(index: number, patch: Partial<WebsocketEventDataShapeField>) {
  const next = fields.value.map((field, fieldIndex) => {
    if (fieldIndex !== index) return field;
    const updated = { ...field, ...patch };
    if (patch.type === 'object' && !updated.children?.length) {
      updated.children = [createWebsocketEventDataShapeField()];
    }
    if (patch.type === 'array') {
      updated.itemType = updated.itemType || 'string';
      if (updated.itemType === 'object' && !updated.children?.length) {
        updated.children = [createWebsocketEventDataShapeField()];
      }
    }
    if (patch.itemType === 'object' && !updated.children?.length) {
      updated.children = [createWebsocketEventDataShapeField()];
    }
    return updated;
  });
  updateFields(next);
}

function updateChildren(index: number, children: WebsocketEventDataShapeField[]) {
  updateField(index, { children });
}

function removeField(index: number) {
  updateFields(fields.value.filter((_, fieldIndex) => fieldIndex !== index));
}
</script>

<template>
  <div
    :class="[
      currentLevel > 0 ? 'space-y-2' : 'grid grid-cols-1 gap-2 xl:grid-cols-2',
      currentLevel > 0 ? 'border-l-2 border-[var(--border-default)] pl-3' : '',
    ]"
  >
    <div
      v-for="(field, index) in fields"
      :key="field.id"
      class="surface-card rounded-lg p-3 space-y-3"
    >
      <div class="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(180px,1fr)_150px_96px_36px] lg:items-center">
        <UInput
          :model-value="field.name"
          placeholder="fieldName"
          size="sm"
          @update:model-value="updateField(index, { name: String($event || '') })"
        />
        <USelect
          :model-value="field.type"
          :items="typeItems"
          value-key="value"
          size="sm"
          @update:model-value="updateField(index, { type: $event as any })"
        />
        <UCheckbox
          :model-value="field.required"
          label="Required"
          @update:model-value="updateField(index, { required: Boolean($event) })"
        />
        <UButton
          icon="lucide:x"
          color="error"
          variant="ghost"
          size="sm"
          square
          @click="removeField(index)"
        />
      </div>

      <div
        v-if="field.type === 'array'"
        class="grid grid-cols-1 gap-2 lg:grid-cols-[150px,1fr] lg:items-center"
      >
        <div class="text-xs font-medium text-[var(--text-tertiary)]">Array item</div>
        <USelect
          :model-value="field.itemType || 'string'"
          :items="arrayItemTypeItems"
          value-key="value"
          size="sm"
          class="max-w-[180px]"
          @update:model-value="updateField(index, { itemType: $event as any })"
        />
      </div>

      <WebsocketDataShapeGroup
        v-if="field.type === 'object' || (field.type === 'array' && field.itemType === 'object')"
        :model-value="field.children || []"
        :level="currentLevel + 1"
        @update:model-value="updateChildren(index, $event)"
      />
    </div>

    <div :class="['flex flex-wrap gap-2', currentLevel === 0 ? 'xl:col-span-2' : '']">
      <UButton icon="lucide:plus" size="xs" variant="soft" @click="addField">
        Add Field
      </UButton>
      <UButton icon="lucide:layers" size="xs" variant="soft" @click="addGroup">
        Add Group
      </UButton>
    </div>
  </div>
</template>
