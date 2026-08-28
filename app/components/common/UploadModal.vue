<template>
    <CommonModal
      v-model:open="isOpen"
      :prevent-close="isLoading"
      :cancel-action="{
        label: 'Cancel',
        icon: 'lucide:x',
        disabled: isLoading,
        onClick: closeModal,
      }"
      :primary-action="{
        label: primaryActionLabel,
        icon: 'lucide:upload',
        loading: isLoading,
        disabled: selectedFiles.length === 0 || isLoading,
        onClick: handleUpload,
      }"
      :ui="{ content: 'sm:max-w-2xl' }"
    >
      <template #header>
        <div class="min-w-0">
          <div class="truncate text-base font-semibold text-[var(--text-primary)]" :title="title">
            {{ title }}
          </div>
          <p class="mt-1 text-sm text-[var(--text-tertiary)]">
            {{ acceptText }}
          </p>
        </div>
      </template>

      <template #body>
        <div class="space-y-4">
          <slot name="header-content" />
          <slot name="warning" />

          <div
            class="upload-drop-zone"
            :class="{
              'upload-drop-zone-active': isDragOver && !isLoading,
              'upload-drop-zone-error': hasError,
              'pointer-events-none opacity-50': isLoading,
            }"
            @dragenter.prevent="handleDragEnter"
            @dragover.prevent="handleDragOver"
            @dragleave.prevent="handleDragLeave"
            @drop.prevent="handleDrop"
          >
            <div class="space-y-4">
              <UIcon
                name="i-heroicons-cloud-arrow-up"
                class="text-[var(--text-quaternary)] mx-auto text-8xl"
              />
              <div class="space-y-2">
                <p
                  class="text-base font-medium text-[var(--text-primary)]"
                >
                  {{ dragText }}
                </p>
                <p class="text-sm text-[var(--text-tertiary)]">
                  {{ acceptText }}
                </p>
              </div>
              <UButton
                color="primary"
                variant="solid"
                size="lg"
                :disabled="isLoading"
                @click="triggerFileInput"
              >
                Choose File
              </UButton>
            </div>
          </div>

          <input
            ref="fileInput"
            type="file"
            class="hidden"
            :accept="acceptString"
            :multiple="multiple"
            @change="handleFileSelect"
          />

          <div v-if="selectedFiles.length > 0" class="space-y-2">
            <div
              v-for="(file, index) in selectedFiles"
              :key="index"
              class="upload-file-row"
            >
              <div class="flex min-w-0 flex-1 items-center gap-3">
                <div class="upload-file-icon">
                  <UIcon
                    name="i-heroicons-document-check"
                    class="h-5 w-5"
                  />
                </div>
                <div class="min-w-0 flex-1">
                  <p
                    class="truncate text-sm font-semibold text-[var(--text-primary)]"
                    :title="file.name"
                  >
                    {{ file.name }}
                  </p>
                  <p class="text-xs font-medium text-[var(--text-tertiary)]">
                    {{ formatFileSize(file.size) }}
                  </p>
                </div>
              </div>
              <div
                v-if="fileDisplayProgresses[index] !== null"
                class="upload-file-progress"
                :aria-label="`Upload progress ${fileDisplayProgresses[index]}%`"
              >
                <span>{{ fileDisplayProgresses[index] }}%</span>
                <div class="upload-file-progress-track">
                  <div
                    class="upload-file-progress-bar"
                    :style="{ width: `${fileDisplayProgresses[index]}%` }"
                  />
                </div>
              </div>
              <UButton
                color="error"
                variant="ghost"
                icon="i-heroicons-x-mark"
                size="sm"
                square
                class="upload-file-remove"
                :disabled="isLoading"
                @click="removeFile(index)"
              />
            </div>
          </div>

          <div
            v-if="hasError"
            class="rounded-[var(--radius-panel)] border border-[var(--state-danger-outline-border)] bg-[var(--state-danger-soft-bg)] p-4"
          >
            <div class="flex items-center space-x-3">
              <UIcon
                name="i-heroicons-exclamation-triangle"
                class="w-5 h-5 text-[var(--md-error)]"
              />
              <p class="text-sm font-medium text-[var(--state-danger-soft-text)]">
                {{ errorMessage }}
              </p>
            </div>
          </div>
        </div>
      </template>
    </CommonModal>
</template>

<script setup lang="ts">
import type { UploadModalProps, UploadModalEmits } from "~/types";

const props = withDefaults(defineProps<UploadModalProps>(), {
  title: "Upload Files",
  accept: "**",
  multiple: false,
  maxSize: 10 * 1024 * 1024,
  dragText: "Drag and drop files here",
  acceptText: "or click to browse",
  uploadText: "Upload",
  uploadingText: "Uploading...",
  loading: false,
  uploadProgress: null,
  fileProgress: () => ({}),
});

const emit = defineEmits<UploadModalEmits>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const fileInput = ref<HTMLInputElement>();
const selectedFiles = ref<File[]>([]);
const isDragOver = ref(false);
const dragCounter = ref(0);
const hasError = ref(false);
const errorMessage = ref("");
const uploading = ref(false);

const isLoading = computed(() => props.loading || uploading.value);

const acceptString = computed(() => {
  if (Array.isArray(props.accept)) {
    return props.accept.join(",");
  }
  return props.accept;
});

const dragText = computed(() => props.dragText || "Drag and drop files here");
const acceptText = computed(() => props.acceptText || "or click to browse");
const uploadText = computed(() => props.uploadText || "Upload");
const uploadingText = computed(() => props.uploadingText || "Uploading...");
const normalizedUploadProgress = computed(() => {
  if (props.uploadProgress === null || props.uploadProgress === undefined) {
    return null;
  }
  if (!Number.isFinite(props.uploadProgress)) {
    return null;
  }
  return Math.min(100, Math.max(0, Math.round(props.uploadProgress)));
});
const displayUploadProgress = computed(() => {
  if (!isLoading.value) return null;
  return normalizedUploadProgress.value;
});
const getDerivedFileProgress = (index: number, total: number) => {
  const progress = displayUploadProgress.value;
  if (progress === null) return null;
  if (total <= 1) return progress;

  const segmentSize = 100 / total;
  const segmentStart = index * segmentSize;
  const segmentProgress = ((progress - segmentStart) / segmentSize) * 100;
  return Math.min(100, Math.max(0, Math.round(segmentProgress)));
};
const fileDisplayProgresses = computed(() =>
  selectedFiles.value.map((_, index) => {
    if (!isLoading.value) return null;
    const progress = props.fileProgress?.[index];
    if (progress !== null && progress !== undefined && Number.isFinite(progress)) {
      return Math.min(100, Math.max(0, Math.round(progress)));
    }
    return getDerivedFileProgress(index, selectedFiles.value.length);
  }),
);
const primaryActionLabel = computed(() => {
  if (!isLoading.value) return uploadText.value;
  return displayUploadProgress.value === null
    ? uploadingText.value
    : `${uploadingText.value} ${displayUploadProgress.value}%`;
});

const validateFile = (file: File): string | null => {
  const acceptValue = Array.isArray(props.accept) ? props.accept.join(",") : props.accept;
  if (acceptValue && acceptValue !== "**") {
    const acceptTypes = acceptValue?.split(",").map((t) => t.trim()) || [];
    const isValidType = acceptTypes.some((type) => {
      if (type.startsWith(".")) {
        return file.name?.toLowerCase().endsWith(type.toLowerCase()) ?? false;
      }
      if (type.includes("*")) {
        if (type === "*/*") return true;
        const [mainType] = type.split("/");
        return mainType ? file.type.startsWith(mainType) : false;
      }
      return file.type === type;
    });

    if (!isValidType) {
      return `Invalid file type. Expected: ${acceptValue}`;
    }
  }

  if (props.maxSize && file.size > props.maxSize) {
    return `File too large. Maximum size: ${formatFileSize(props.maxSize)}`;
  }

  return null;
};

const setError = (message: string) => {
  hasError.value = true;
  errorMessage.value = message;
  emit("error", message);
};

const clearError = () => {
  hasError.value = false;
  errorMessage.value = "";
};

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const files = input.files;

  if (files && files.length > 0) {
    const newFiles: File[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name || "Unknown file"}: ${error}`);
      } else {
        newFiles.push(file);
      }
    }

    if (errors.length > 0) {
      setError(errors.join(", "));
      return;
    }

    clearError();
    if (props.multiple) {
      selectedFiles.value.push(...newFiles);
    } else {
      const firstFile = newFiles[0];
      if (firstFile) {
        selectedFiles.value = [firstFile];
      }
    }
  }
};

const handleDragEnter = (e: DragEvent) => {
  e.preventDefault();
  dragCounter.value++;
  isDragOver.value = true;
};

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
};

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault();
  dragCounter.value--;
  if (dragCounter.value === 0) {
    isDragOver.value = false;
  }
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  dragCounter.value = 0;
  isDragOver.value = false;

  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    const newFiles: File[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name || "Unknown file"}: ${error}`);
      } else {
        newFiles.push(file);
      }
    }

    if (errors.length > 0) {
      setError(errors.join(", "));
      return;
    }

    clearError();
    if (props.multiple) {
      selectedFiles.value.push(...newFiles);
    } else {
      const firstFile = newFiles[0];
      if (firstFile) {
        selectedFiles.value = [firstFile];
      }
    }
  }
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

const clearFiles = () => {
  selectedFiles.value = [];
  clearError();
  if (fileInput.value) {
    fileInput.value.value = "";
  }
};

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1);
  if (selectedFiles.value.length === 0) {
    clearError();
    if (fileInput.value) {
      fileInput.value.value = "";
    }
  }
};

const handleUpload = async () => {
  if (selectedFiles.value.length === 0 || isLoading.value) return;

  uploading.value = true;
  try {
    if (props.multiple) {
      emit("upload", selectedFiles.value);
    } else {
      const firstFile = selectedFiles.value[0];
      if (firstFile) {
        emit("upload", firstFile);
      }
    }
  } finally {
    uploading.value = false;
  }
};

const closeModal = () => {
  clearFiles();
  isOpen.value = false;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

watch(isOpen, (newValue) => {
  if (!newValue) {
    clearFiles();
  }
});
</script>

<style scoped>
.upload-drop-zone {
  border: 2px dashed var(--border-strong);
  border-radius: var(--radius-card);
  padding: 2.5rem;
  text-align: center;
  transition: border-color var(--duration-fast) var(--ease-standard), background-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard);
}

.upload-drop-zone:hover {
  border-color: var(--border-accent);
  background: color-mix(in srgb, var(--state-primary-soft-bg) 36%, transparent);
}

.upload-drop-zone-active {
  border-color: var(--border-accent);
  background: var(--state-primary-soft-bg);
  transform: scale(1.01);
}

.upload-drop-zone-error {
  border-color: var(--state-danger-outline-border);
  background: var(--state-danger-soft-bg);
}

.upload-drop-zone-error:hover,
.upload-drop-zone-error.upload-drop-zone-active {
  border-color: var(--state-danger-outline-border);
  background: var(--state-danger-soft-bg);
}

.upload-file-row {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-panel);
  background: var(--surface-muted);
  box-shadow: inset 3px 0 0 var(--state-success-outline-border);
  padding: 0.75rem;
}

.upload-file-icon {
  display: flex;
  width: 2.25rem;
  height: 2.25rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-control);
  border: 1px solid var(--state-success-outline-border);
  background: var(--state-success-soft-bg);
  color: var(--state-success-soft-text);
}

.upload-file-remove {
  flex: 0 0 auto;
  border-radius: var(--radius-subcontrol);
  cursor: pointer;
}

.upload-file-progress {
  display: flex;
  min-width: 5.5rem;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--state-primary-soft-text);
  font-variant-numeric: tabular-nums;
}

.upload-file-progress-track {
  width: 4.5rem;
  height: 0.375rem;
  overflow: hidden;
  border-radius: var(--radius-subcontrol);
  background: var(--surface-default);
  box-shadow: inset 0 0 0 1px var(--border-default);
}

.upload-file-progress-bar {
  height: 100%;
  border-radius: var(--radius-subcontrol);
  background: var(--action-primary-bg);
  transition: width var(--duration-fast) var(--ease-standard);
}
</style>
