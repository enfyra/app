<script setup lang="ts">
defineOptions({ inheritAttrs: false });

import type { EditorToolbarItem } from "@nuxt/ui/components/EditorToolbar.vue";
import type { StarterKitOptions } from "@tiptap/starter-kit";
import type { Editor } from "@tiptap/vue-3";
import { createLowlight } from "lowlight";
import { enfyraConfig } from "../../../enfyra.config";
import type {
  RichTextEditorButtonConfig,
  RichTextEditorConfig,
  RichTextEditorController,
} from "~/types/rich-text-editor";
import { ensureString } from "~/utils/components/form";
import {
  getRichTextToolbarGroups,
  mergeRichTextEditorConfig,
  normalizeRichTextHtml,
} from "~/utils/form/rich-text-config";
import { buildRichTextExtensions } from "~/utils/form/rich-text-extensions";
import { injectRichTextCustomStyles } from "~/utils/form/rich-text-styles";

type EditorHandler = {
  canExecute: (editor: Editor, command?: unknown) => boolean;
  execute: (editor: Editor, command?: unknown) => ReturnType<Editor["chain"]>;
  isActive: (editor: Editor, command?: unknown) => boolean;
  isDisabled?: (editor: Editor, command?: unknown) => boolean;
};

const props = defineProps<{
  modelValue: string | null;
  disabled?: boolean;
  height?: number;
  placeholder?: string;
  editorConfig?: RichTextEditorConfig;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const editorComponentRef = shallowRef<{ editor?: Editor } | null>(null);
const editorContainerRef = ref<HTMLDivElement>();
const resizeHandleRef = ref<HTMLDivElement>();
const isResizing = ref(false);
const startY = ref(0);
const startHeight = ref(0);
const previewHeight = ref<string | null>(null);
const previewStyle = ref<{ top: string; left: string; width: string; height: string } | null>(null);
const initialHeight = props.height ?? 300;
const currentHeight = ref(`${initialHeight}px`);
const minHeight = computed(() => initialHeight);
const lowlight = createLowlight();
const colorMode = useColorMode();
const linkModalOpen = ref(false);
const imageModalOpen = ref(false);
const linkUrl = ref("");
const imageUrl = ref("");
const editorValue = ref(ensureString(props.modelValue));
let lastEmittedHtml = normalizeRichTextHtml(editorValue.value);

const effectiveConfig = computed(() => mergeRichTextEditorConfig(
  enfyraConfig.richText,
  props.editorConfig,
));
const enabledPlugins = computed(() => effectiveConfig.value.plugins
  ? new Set(effectiveConfig.value.plugins)
  : null);
const starterKit = computed<Partial<StarterKitOptions>>(() => ({
  heading: { levels: [1, 2, 3, 4, 5, 6] },
  link: isPluginEnabled("link") ? { openOnClick: false } : false,
  bulletList: isPluginEnabled("lists") ? { keepMarks: true, keepAttributes: false } : false,
  orderedList: isPluginEnabled("lists") ? { keepMarks: true, keepAttributes: false } : false,
  codeBlock: false,
}));
const extensions = computed(() => buildRichTextExtensions(
  effectiveConfig.value,
  lowlight,
  colorMode.value as "light" | "dark",
));
const toolbarItems = computed<EditorToolbarItem[][]>(() => getRichTextToolbarGroups(effectiveConfig.value)
  .map((group) => group
    .map((key) => createToolbarItem(key))
    .filter((item): item is EditorToolbarItem => Boolean(item)))
  .filter((group) => group.length > 0));
const customHandlers = computed<Record<string, EditorHandler>>(() => ({
  link: createLinkHandler(),
  image: createImageHandler(),
  ...Object.fromEntries(
    (effectiveConfig.value.customButtons ?? []).map((button) => [
      customHandlerName(button.name),
      createCustomHandler(button),
    ]),
  ),
}));

watch(editorValue, (value) => {
  const html = normalizeRichTextHtml(value);
  if (html === lastEmittedHtml) return;
  lastEmittedHtml = html;
  emit("update:modelValue", html);
});

watch(
  () => props.modelValue,
  (value) => {
    const html = normalizeRichTextHtml(ensureString(value));
    if (html === normalizeRichTextHtml(editorValue.value)) {
      lastEmittedHtml = html;
      return;
    }
    editorValue.value = html;
    lastEmittedHtml = html;
  },
);

watch(
  () => props.height,
  (height) => {
    if (height) currentHeight.value = `${height}px`;
  },
);

watch(
  effectiveConfig,
  (config) => {
    nextTick(() => injectRichTextCustomStyles(config));
  },
  { immediate: true, deep: true },
);

function isPluginEnabled(plugin: string): boolean {
  return !enabledPlugins.value || enabledPlugins.value.has(plugin);
}

function getEditor(): Editor | null {
  return editorComponentRef.value?.editor ?? null;
}

function customHandlerName(name: string): string {
  return `enfyra:${name}`;
}

function createLinkHandler(): EditorHandler {
  return {
    canExecute: (editor) => editor.can().setLink({ href: "" }) || editor.can().unsetLink(),
    execute: (editor) => {
      if (editor.isActive("link")) return editor.chain().focus().unsetLink();
      linkModalOpen.value = true;
      return editor.chain();
    },
    isActive: (editor) => editor.isActive("link"),
  };
}

function createImageHandler(): EditorHandler {
  return {
    canExecute: (editor) => editor.can().setImage({ src: "" }),
    execute: (editor) => {
      imageModalOpen.value = true;
      return editor.chain();
    },
    isActive: (editor) => editor.isActive("image"),
  };
}

function createController(editor: Editor): RichTextEditorController {
  return {
    focus: () => {
      editor.chain().focus().run();
    },
    getHTML: () => normalizeRichTextHtml(editor.getHTML()),
    setHTML: (html) => {
      editor.commands.setContent(html);
    },
    insertContent: (content) => {
      editor.chain().focus().insertContent(content).run();
    },
    toggleFormat: (name) => {
      toggleCustomFormat(editor, name);
    },
    isFormatActive: (name) => editor.isActive(name),
    undo: () => {
      editor.chain().focus().undo().run();
    },
    redo: () => {
      editor.chain().focus().redo().run();
    },
  };
}

function toggleCustomFormat(editor: Editor, name: string) {
  const format = effectiveConfig.value.formats?.[name];
  if (!format) return editor.chain();

  if (format.inline) return editor.chain().focus().toggleMark(name);
  if (format.wrapper) {
    return editor.isActive(name)
      ? editor.chain().focus().lift(name)
      : editor.chain().focus().wrapIn(name);
  }
  return editor.isActive(name)
    ? editor.chain().focus().setNode("paragraph")
    : editor.chain().focus().setNode(name);
}

function createCustomHandler(button: RichTextEditorButtonConfig): EditorHandler {
  return {
    canExecute: () => true,
    execute: (editor) => {
      if (button.format) return toggleCustomFormat(editor, button.format);
      const controller = createController(editor);
      if (typeof button.onAction === "function") {
        button.onAction(controller, button.params);
      } else if (button.onAction) {
        effectiveConfig.value.buttonActions?.[button.onAction]?.(controller, button.params);
      }
      return editor.chain();
    },
    isActive: (editor) => Boolean(button.format && editor.isActive(button.format)),
  };
}

function createToolbarItem(key: string): EditorToolbarItem | null {
  const custom = effectiveConfig.value.customButtons?.find((button) => button.name === key);
  if (custom) {
    return {
      kind: customHandlerName(custom.name),
      icon: custom.icon || "lucide:circle",
      label: custom.text,
      "aria-label": custom.tooltip || custom.text || custom.name,
      tooltip: custom.tooltip ? { text: custom.tooltip } : undefined,
    } as EditorToolbarItem;
  }

  if (/^h[1-6]$/.test(key)) {
    const level = Number(key.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6;
    return {
      kind: "heading",
      level,
      icon: `lucide:heading-${level}`,
      "aria-label": `Heading ${level}`,
    };
  }

  const items: Record<string, EditorToolbarItem> = {
    headings: {
      icon: "i-lucide-heading",
      tooltip: { text: "Headings" },
      content: { align: "start" },
      items: [1, 2, 3, 4, 5, 6].map((level) => ({
        kind: "heading" as const,
        level: level as 1 | 2 | 3 | 4 | 5 | 6,
        icon: `i-lucide-heading-${level}`,
        label: `Heading ${level}`,
      })),
    },
    lists: {
      icon: "i-lucide-list",
      tooltip: { text: "Lists" },
      content: { align: "start" },
      items: [
        { kind: "bulletList", icon: "i-lucide-list", label: "Bullet List" },
        { kind: "orderedList", icon: "i-lucide-list-ordered", label: "Ordered List" },
      ],
    },
    align: {
      icon: "i-lucide-align-justify",
      tooltip: { text: "Text Align" },
      content: { align: "end" },
      items: [
        { kind: "textAlign", align: "left", icon: "i-lucide-align-left", label: "Align Left" },
        { kind: "textAlign", align: "center", icon: "i-lucide-align-center", label: "Align Center" },
        { kind: "textAlign", align: "right", icon: "i-lucide-align-right", label: "Align Right" },
        { kind: "textAlign", align: "justify", icon: "i-lucide-align-justify", label: "Align Justify" },
      ],
    },
    bold: { kind: "mark", mark: "bold", icon: "i-lucide-bold", tooltip: { text: "Bold" } },
    italic: { kind: "mark", mark: "italic", icon: "i-lucide-italic", tooltip: { text: "Italic" } },
    underline: { kind: "mark", mark: "underline", icon: "i-lucide-underline", tooltip: { text: "Underline" } },
    strike: { kind: "mark", mark: "strike", icon: "i-lucide-strikethrough", tooltip: { text: "Strikethrough" } },
    code: { kind: "mark", mark: "code", icon: "i-lucide-code", tooltip: { text: "Code" } },
    paragraph: { kind: "paragraph", icon: "lucide:pilcrow", "aria-label": "Paragraph" },
    bullist: { kind: "bulletList", icon: "lucide:list", "aria-label": "Bullet list" },
    numlist: { kind: "orderedList", icon: "lucide:list-ordered", "aria-label": "Ordered list" },
    alignleft: { kind: "textAlign", align: "left", icon: "lucide:align-left", "aria-label": "Align left" },
    aligncenter: { kind: "textAlign", align: "center", icon: "lucide:align-center", "aria-label": "Align center" },
    alignright: { kind: "textAlign", align: "right", icon: "lucide:align-right", "aria-label": "Align right" },
    alignjustify: { kind: "textAlign", align: "justify", icon: "lucide:align-justify", "aria-label": "Justify" },
    link: { kind: "link", icon: "i-lucide-link", tooltip: { text: "Link" } },
    image: { kind: "image", icon: "i-lucide-image", tooltip: { text: "Image" } },
    table: {
      icon: "lucide:table",
      "aria-label": "Table",
      items: [[
        { label: "Insert table", icon: "lucide:table-2", onSelect: () => insertTable() },
        { type: "separator" },
        { label: "Add row before", icon: "lucide:arrow-up", onSelect: () => runTableCommand("addRowBefore") },
        { label: "Add row after", icon: "lucide:arrow-down", onSelect: () => runTableCommand("addRowAfter") },
        { label: "Delete row", icon: "lucide:trash-2", onSelect: () => runTableCommand("deleteRow") },
        { type: "separator" },
        { label: "Add column before", icon: "lucide:arrow-left", onSelect: () => runTableCommand("addColumnBefore") },
        { label: "Add column after", icon: "lucide:arrow-right", onSelect: () => runTableCommand("addColumnAfter") },
        { label: "Delete column", icon: "lucide:trash-2", onSelect: () => runTableCommand("deleteColumn") },
        { type: "separator" },
        { label: "Toggle header row", icon: "lucide:panel-top", onSelect: () => runTableCommand("toggleHeaderRow") },
        { label: "Toggle header column", icon: "lucide:columns", onSelect: () => runTableCommand("toggleHeaderColumn") },
        { label: "Merge cells", icon: "lucide:combine", onSelect: () => runTableCommand("mergeCells") },
        { label: "Split cell", icon: "lucide:square", onSelect: () => runTableCommand("splitCell") },
        { type: "separator" },
        { label: "Delete table", icon: "lucide:trash", color: "error", onSelect: () => runTableCommand("deleteTable") },
      ]],
    },
    blockquote: { kind: "blockquote", icon: "i-lucide-text-quote", tooltip: { text: "Blockquote" } },
    hr: { kind: "horizontalRule", icon: "i-lucide-minus", tooltip: { text: "Horizontal rule" } },
    codeblock: { kind: "codeBlock", icon: "i-lucide-square-code", tooltip: { text: "Code Block" } },
    clear: { kind: "clearFormatting", icon: "i-lucide-eraser", tooltip: { text: "Clear formatting" } },
    undo: { kind: "undo", icon: "i-lucide-undo", tooltip: { text: "Undo" } },
    redo: { kind: "redo", icon: "i-lucide-redo", tooltip: { text: "Redo" } },
  };

  return items[key] ?? null;
}

function confirmLink() {
  const editor = getEditor();
  if (linkUrl.value && editor) editor.chain().focus().setLink({ href: linkUrl.value }).run();
  linkUrl.value = "";
  linkModalOpen.value = false;
}

function confirmImage() {
  const editor = getEditor();
  if (imageUrl.value && editor) editor.chain().focus().setImage({ src: imageUrl.value }).run();
  imageUrl.value = "";
  imageModalOpen.value = false;
}

function insertTable() {
  getEditor()?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
}

function runTableCommand(command: string) {
  const editor = getEditor();
  if (!editor) return;
  const chain = editor.chain().focus() as unknown as Record<string, () => { run: () => boolean }>;
  chain[command]?.().run();
}

function handleEditorShellMouseDown(event: MouseEvent) {
  if (props.disabled) return;
  const target = event.target as HTMLElement;
  if (target.closest(".ProseMirror, button, a, input, [role='button'], [role='menu'], [role='toolbar'], [data-resize-handle]")) return;
  event.preventDefault();
  editorContainerRef.value?.querySelector<HTMLElement>(".ProseMirror")?.focus();
}

function handleMouseDown(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
  if (!editorContainerRef.value) return;

  const rect = editorContainerRef.value.getBoundingClientRect();
  isResizing.value = true;
  startY.value = event.clientY;
  startHeight.value = rect.height;
  previewStyle.value = {
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  };

  document.addEventListener("mousemove", handleMouseMove, { passive: false });
  document.addEventListener("mouseup", handleMouseUp, { passive: false });
  document.addEventListener("mouseleave", handleMouseUp, { passive: false });
  editorContainerRef.value.style.pointerEvents = "none";
  if (resizeHandleRef.value) resizeHandleRef.value.style.userSelect = "none";
  document.body.style.userSelect = "none";
  document.body.style.cursor = "ns-resize";
}

function handleMouseMove(event: MouseEvent) {
  if (!isResizing.value || !editorContainerRef.value) return;
  event.preventDefault();
  event.stopPropagation();
  const height = `${Math.max(minHeight.value, startHeight.value + event.clientY - startY.value)}px`;
  const rect = editorContainerRef.value.getBoundingClientRect();
  previewHeight.value = height;
  previewStyle.value = {
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height,
  };
}

function handleMouseUp(event?: MouseEvent) {
  event?.preventDefault();
  event?.stopPropagation();
  const height = previewHeight.value || currentHeight.value;
  isResizing.value = false;
  previewHeight.value = null;
  previewStyle.value = null;
  currentHeight.value = height;
  removeResizeListeners();
}

function removeResizeListeners() {
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
  document.removeEventListener("mouseleave", handleMouseUp);
  if (editorContainerRef.value) editorContainerRef.value.style.pointerEvents = "";
  if (resizeHandleRef.value) resizeHandleRef.value.style.userSelect = "";
  document.body.style.userSelect = "";
  document.body.style.cursor = "";
}

onBeforeUnmount(removeResizeListeners);
</script>

<template>
  <div v-bind="$attrs">
    <Teleport to="body">
      <div
        v-if="isResizing && previewStyle"
        class="fixed pointer-events-none z-50 rounded-[var(--radius-control)] border-2 border-dashed border-[var(--control-border-focus)] bg-[var(--theme-focus-ring)]"
        :style="previewStyle"
      />
    </Teleport>

    <div
      ref="editorContainerRef"
      class="group/rich-text relative flex flex-col"
      :style="{ height: currentHeight, minHeight: `${minHeight}px` }"
    >
      <div
        class="rich-text-editor relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-control)] border border-[var(--control-border)] bg-[var(--control-bg)] shadow-theme-xs transition-colors transition-shadow duration-[var(--duration-base)] focus-within:border-[var(--control-border-focus)] focus-within:outline-none focus-within:ring-3 focus-within:ring-inset focus-within:ring-primary"
        :class="disabled ? 'cursor-not-allowed !border-[var(--control-disabled-border)] !bg-[var(--control-disabled-bg)] text-[var(--control-disabled-text)]' : 'cursor-text'"
        @mousedown="handleEditorShellMouseDown"
      >
        <UEditor
          ref="editorComponentRef"
          v-model="editorValue"
          content-type="html"
          class="flex min-h-0 flex-1 flex-col"
          :editable="!disabled"
          :starter-kit="starterKit"
          :extensions="extensions"
          :handlers="customHandlers"
          :mention="false"
          :ui="{
            content: 'min-h-0 overflow-y-auto',
            base: 'px-4 pt-4 pb-6 sm:px-4',
          }"
          :placeholder="placeholder || 'Type something...'"
        >
          <template #default="{ editor }">
            <UEditorToolbar
              :editor="editor"
              :items="toolbarItems"
              class="shrink-0 overflow-x-auto border-b border-[var(--control-border)] px-4 py-2"
            />
          </template>
        </UEditor>
      </div>

      <div
        ref="resizeHandleRef"
        data-resize-handle
        class="relative flex h-4 shrink-0 cursor-ns-resize select-none items-center justify-center"
        :class="{ 'pointer-events-none opacity-50': disabled }"
        style="touch-action: none"
        @mousedown="handleMouseDown"
      >
        <div
          class="h-1 w-14 rounded-full bg-[var(--text-tertiary)] transition-colors group-hover/rich-text:bg-[var(--control-border-focus)]"
          :class="{ '!bg-[var(--control-border-focus)]': isResizing }"
        />
      </div>
    </div>

    <FormRichTextPromptModal
      v-model:open="linkModalOpen"
      v-model="linkUrl"
      title="Add Link"
      label="URL"
      placeholder="https://example.com"
      confirm-label="Add Link"
      @confirm="confirmLink"
    />

    <FormRichTextPromptModal
      v-model:open="imageModalOpen"
      v-model="imageUrl"
      title="Add Image"
      label="Image URL"
      placeholder="https://example.com/image.jpg"
      confirm-label="Add Image"
      @confirm="confirmImage"
    />
  </div>
</template>
