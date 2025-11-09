<template>
  <div class="flex items-start justify-between gap-2">
    <div
      v-if="editingFileId === file.id"
      class="flex items-center gap-1 flex-1"
    >
      <input
        v-model="localEditingName"
        @keyup.enter="!editingLoading && $emit('save-edit')"
        @keyup.escape="!editingLoading && $emit('cancel-edit')"
        :disabled="editingLoading"
        :data-editing-id="file.id"
        class="flex-1 text-xs font-medium bg-gray-800 border border-primary rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary text-white disabled:opacity-50 disabled:cursor-not-allowed"
        @click.stop
      />
      <div v-if="editingLoading" class="flex items-center">
        <UIcon
          name="lucide:loader-2"
          class="w-4 h-4 animate-spin text-primary"
        />
      </div>
      <div v-else class="flex items-center gap-1">
        <UButton
          v-if="localEditingName.trim() !== originalName"
          icon="lucide:check"
          size="xs"
          color="success"
          variant="solid"
          @click.stop="$emit('save-edit')"
          class="!p-1 !min-w-[24px] !w-6 !h-6 flex items-center justify-center"
        />
        <UButton
          icon="lucide:x"
          size="xs"
          color="error"
          variant="solid"
          @click.stop="$emit('cancel-edit')"
          class="!p-1 !min-w-[24px] !w-6 !h-6 flex items-center justify-center [&_svg]:text-white"
        />
      </div>
    </div>

    <div
      v-else
      class="flex items-center justify-between gap-2 flex-1 min-w-0"
    >
      <h3
        class="text-sm font-medium text-white truncate flex-1 min-w-0"
        :title="file.displayName"
        @dblclick="!isSelectionMode && $emit('start-rename')"
      >
        {{ file.displayName }}
      </h3>
      <UButton
        v-if="!isSelectionMode"
        icon="lucide:edit-3"
        size="xs"
        variant="ghost"
        color="neutral"
        @click.stop="$emit('start-rename')"
        class="opacity-0 lg:group-hover:opacity-100 transition-opacity ml-1 hover:bg-white/10"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FileItem } from "~/utils/types";

interface Props {
  file: FileItem & {
    displayName: string;
  };
  editingFileId: string | null;
  editingName: string;
  editingLoading: boolean;
  originalName: string;
  isSelectionMode: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "start-rename": [];
  "save-edit": [];
  "cancel-edit": [];
  "update:editing-name": [value: string];
}>();

const localEditingName = computed({
  get: () => props.editingName,
  set: (value: string) => {
    emit("update:editing-name", value);
  }
});
</script>