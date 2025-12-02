<script setup lang="ts">
import { useModel } from "#imports";

const props = withDefaults(
  defineProps<{
    modelValue: any;
    new?: boolean;
  }>(),
  {
    new: false,
  }
);

const emit = defineEmits(["save"]);
const table = useModel(props, "modelValue");
const { isMobile, isTablet } = useScreen();
</script>

<template>
  <div class="space-y-6">
    <!-- Table Name slot for create new -->
    <slot name="tableName" />
    
    <!-- Table Description -->
    <div class="mb-6">
      <UFormField label="Description">
        <UTextarea
          v-model="table.description"
          placeholder="Describe this table"
          autoresize
          variant="outline"
          class="text-sm w-full"
        />
      </UFormField>
    </div>
    
    <!-- Is Single Record -->
    <div
      :class="(isMobile || isTablet) ? 'flex items-center justify-between py-4 border-t' : 'flex items-center justify-between py-4 border-t border-b'"
      :style="{
        borderColor: 'var(--border-subtle)',
      }"
    >
      <div class="space-y-0.5">
        <label
          for="field-isSingleRecord"
          class="text-sm font-medium"
          :style="{ color: 'var(--text-primary)' }"
        >
          isSingleRecord
        </label>
        <p
          class="text-xs"
          :style="{ color: 'var(--text-tertiary)' }"
        >
          When enabled, this table will only allow one record to exist at a time.
        </p>
      </div>

      <!-- Right: Switch/Toggle -->
      <USwitch
        id="field-isSingleRecord"
        v-model="table.isSingleRecord"
        :checked="table.isSingleRecord || false"
      />
    </div>
    
    <!-- Table Content -->
    <slot />
  </div>
</template>
