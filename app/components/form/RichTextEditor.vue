<script setup lang="ts">
declare global {
  interface Window {
    tinymce: any;
  }
}
import { ensureString } from "../../utils/components/form";

const props = defineProps<{
  modelValue: string | null;
  disabled?: boolean;
  height?: number;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: string): void;
}>();

const textareaId = `tinymce-${Math.random().toString(36).slice(2)}`;
const editorRef = ref<any>(null);

const isLoading = ref(true);
const isError = ref(false);

function loadTinyMCE(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.tinymce) {
      isLoading.value = false;
      return resolve();
    }

    const s = document.createElement("script");
    s.src = "/tinymce/tinymce.min.js";
    s.onload = () => {
      isLoading.value = false;
      resolve();
    };
    s.onerror = () => {
      isLoading.value = false;
      isError.value = true;
      reject(new Error("TinyMCE load failed"));
    };
    document.head.appendChild(s);
  });
}

onMounted(async () => {
  try {
    await loadTinyMCE();

    window.tinymce.init({
      selector: `#${textareaId}`,
      skin_url: "/tinymce/skins/ui/oxide-dark",
      content_css: "/tinymce/skins/content/dark/content.css",
      icons_url: "/tinymce/icons/default/icons.min.js",
      plugins: ["link", "lists", "code", "table"],
      skin: "oxide-dark",
      external_plugins: {
        link: "/tinymce/plugins/link/plugin.min.js",
        lists: "/tinymce/plugins/lists/plugin.min.js",
        code: "/tinymce/plugins/code/plugin.min.js",
        table: "/tinymce/plugins/table/plugin.min.js",
      },
      toolbar:
        "undo redo  | bold italic underline | " +
        "bullist numlist | link table | code",
      menubar: false,
      height: props.height ?? 300,
      readonly: props.disabled ?? false,
      license_key: "gpl",
      setup(editor: any) {
        editorRef.value = editor;

        editor.on("init", () => {
          editor.setContent(ensureString(props.modelValue));
        });

        editor.on("Change KeyUp Undo Redo", () => {
          emit("update:modelValue", editor.getContent());
        });
      },
    });
  } catch (error) {}
});

watch(
  () => props.modelValue,
  (v) => {
    if (editorRef.value && v !== editorRef.value.getContent()) {
      editorRef.value.setContent(ensureString(v));
    }
  }
);

onBeforeUnmount(() => {
  if (editorRef.value) {
    editorRef.value.destroy();
    editorRef.value = null;
  }
});
</script>

<template>
  <div class="rich-text-editor">
    <!-- Loading State -->
    <div
      v-if="isLoading"
      class="flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700"
    >
      <div class="text-center">
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3"
        ></div>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Loading rich text editor...
        </p>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="isError"
      class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
    >
      <div class="flex">
        <div class="flex-shrink-0">
          <svg
            class="h-5 w-5 text-red-400 dark:text-red-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800 dark:text-red-300">
            Rich text editor failed to load
          </h3>
          <p class="text-sm text-red-700 dark:text-red-400 mt-1">
            Please refresh the page to try again.
          </p>
        </div>
      </div>
    </div>

    <!-- TinyMCE Editor -->
    <textarea v-else :id="textareaId"></textarea>
  </div>
</template>

<style lang="scss">
.tox .tox-edit-area::before {
  border: none !important;
}
</style>
