<template>
  <Teleport to="body">
    <UModal v-model:open="isOpen">
      <template #header>
        <div class="flex justify-between items-center w-full gap-3">
          <div class="text-base font-semibold min-w-0 flex-1 truncate" :title="title">
            {{ title }}
          </div>
          <UButton
            icon="lucide:x"
            color="error"
            variant="soft"
            @click="closeModal"
            class="flex-shrink-0"
          >
            Cancel
          </UButton>
        </div>
      </template>

      <template #body>
        <div class="space-y-3">
          <slot name="header-content" />
          <div
            ref="dropZone"
            class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-10 text-center transition-all duration-200 lg:hover:border-primary-400"
            :class="{
              'border-primary-500 bg-primary-50 dark:bg-primary-950 scale-105':
                isDragOver && !isLoading,
              'border-red-500 bg-red-50 dark:bg-red-950': hasError,
              'opacity-50 pointer-events-none': isLoading,
            }"
            @dragenter.prevent="handleDragEnter"
            @dragover.prevent="handleDragOver"
            @dragleave.prevent="handleDragLeave"
            @drop.prevent="handleDrop"
          >
            <div class="space-y-4">
              <UIcon
                name="i-heroicons-cloud-arrow-up"
                class="text-gray-400 mx-auto text-8xl"
              />
              <div class="space-y-2">
                <p
                  class="text-base font-medium text-gray-900 dark:text-gray-100"
                >
                  {{ dragText }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
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
              class="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl p-2"
            >
              <div class="flex items-center justify-between min-w-0">
                <div class="flex items-center space-x-4 min-w-0 flex-1">
                  <div
                    class="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center flex-shrink-0"
                  >
                    <UIcon
                      name="i-heroicons-document-check"
                      class="w-5 h-5 text-green-600 dark:text-green-400"
                    />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p
                      class="text-base font-medium text-gray-900 dark:text-gray-100 truncate"
                      :title="file.name"
                    >
                      {{ file.name }}
                    </p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      {{ formatFileSize(file.size) }}
                    </p>
                  </div>
                </div>
                <UButton
                  color="error"
                  variant="soft"
                  icon="i-heroicons-x-mark"
                  size="lg"
                  square
                  class="rounded-full cursor-pointer"
                  :disabled="isLoading"
                  @click="removeFile(index)"
                />
              </div>
            </div>
          </div>

          <div
            v-if="hasError"
            class="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-4"
          >
            <div class="flex items-center space-x-3">
              <UIcon
                name="i-heroicons-exclamation-triangle"
                class="w-5 h-5 text-red-500"
              />
              <p class="text-sm font-medium text-red-800 dark:text-red-200">
                {{ errorMessage }}
              </p>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="w-full">
          <slot name="warning" />
          <UButton
            color="primary"
            variant="solid"
            size="lg"
            block
            :disabled="selectedFiles.length === 0 || isLoading"
            :loading="isLoading"
            @click="handleUpload"
          >
            {{ isLoading ? uploadingText : uploadText }}
          </UButton>
        </div>
      </template>
    </UModal>
  </Teleport>
</template>

<script setup lang="ts">
import type { UploadModalProps, UploadModalEmits } from "../../utils/types";

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
});

const emit = defineEmits<UploadModalEmits>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const fileInput = ref<HTMLInputElement>();
const dropZone = ref<HTMLElement>();
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
