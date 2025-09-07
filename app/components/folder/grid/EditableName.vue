<template>
  <div class="flex items-start justify-between gap-2">
    <div
      v-if="editingFolderId === folder.id"
      class="flex items-center gap-1 flex-1"
    >
      <input
        v-model="localEditingName"
        @keyup.enter="!editingLoading && $emit('save-edit')"
        @keyup.escape="!editingLoading && $emit('cancel-edit')"
        :disabled="editingLoading"
        :data-editing-id="folder.id"
        class="flex-1 text-sm font-semibold bg-white dark:bg-gray-700 border border-primary rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
          class="!p-1 !min-w-[24px] !w-6 !h-6 flex items-center justify-center"
        />
      </div>
    </div>

    <div
      v-else
      class="flex items-center justify-between gap-2 flex-1"
    >
      <h3
        class="font-semibold text-gray-900 dark:text-white truncate flex-1"
        :title="folder.displayName"
        @dblclick="$emit('start-rename')"
      >
        {{ folder.displayName }}
      </h3>
      <UButton
        icon="lucide:edit-3"
        size="xs"
        variant="ghost"
        color="neutral"
        @click.stop="$emit('start-rename')"
        class="opacity-0 lg:group-hover:opacity-100 transition-opacity ml-1"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  folder: any;
  editingFolderId: string | null;
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