<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { createLowlight } from 'lowlight'
import { ensureString } from "../../utils/components/form";
import type { AnyExtension } from '@tiptap/core'
import { Extension } from '@tiptap/core'
import { Mark } from '@tiptap/core'
import { Node } from '@tiptap/core'
import CommonModal from '../common/Modal.vue'
import type { RichTextEditorConfig } from "../../../enfyra.config.types";
import { enfyraConfig } from "../../../enfyra.config";

const insertHorizontalRule = () => {
  editor.value?.chain().focus().setHorizontalRule().run();
};

const insertBlockquote = () => {
  editor.value?.chain().focus().toggleBlockquote().run();
};

const clearFormat = () => {
  editor.value?.chain().focus().unsetAllMarks().run();
  editor.value?.chain().focus().clearNodes().run();
};

const props = defineProps<{
  modelValue: string | null;
  disabled?: boolean;
  height?: number;
  editorConfig?: RichTextEditorConfig;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: string): void;
}>();

const containerRef = ref<HTMLDivElement>();
const resizeHandleRef = ref<HTMLDivElement>();
const previewLayerRef = ref<HTMLDivElement>();
const isFocused = ref(false);
const isResizing = ref(false);
const startY = ref(0);
const startHeight = ref(0);
const previewHeight = ref<string | null>(null);
const previewStyle = ref<{ top: string; left: string; width: string; height: string } | null>(null);

const initialHeight = props.height ?? 300;
const currentHeight = ref(`${initialHeight}px`);
const minHeight = computed(() => initialHeight);
const isMounted = ref(false);

const lowlight = createLowlight();

function camelToKebab(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

const linkModalOpen = ref(false);
const imageModalOpen = ref(false);
const linkUrl = ref('');
const imageUrl = ref('');

type ButtonGroup = string[];

const effectiveConfig = computed<RichTextEditorConfig>(() => {
  const base = enfyraConfig.richText || {};
  const override = props.editorConfig || {};

  const defaultToolbar = 'undo redo | clear | h1 h2 h3 h4 h5 h6 | bold italic underline strike | bullist numlist | alignleft aligncenter alignright alignjustify | link image table blockquote hr';

  const customButtonNames = override.customButtons?.map(btn => btn.name) || [];
  const finalToolbar = customButtonNames.length > 0
    ? defaultToolbar + ' | ' + customButtonNames.join(' ')
    : defaultToolbar;

  const result = {
    ...base,
    ...override,
    toolbar: finalToolbar,
    customButtons: override.customButtons ?? base.customButtons ?? [],
    formats: {
      ...(base.formats || {}),
      ...(override.formats || {}),
    },
    buttonActions: {
      ...(base.buttonActions || {}),
      ...(override.buttonActions || {}),
    },
  };
  return result;
});

const toolbarButtons = computed<ButtonGroup[]>(() => {
  const toolbar = effectiveConfig.value.toolbar || 'bold italic underline | link image | bullist numlist | align';
  const result = toolbar.split('|').map(group => group.trim().split(/\s+/).filter(Boolean));
  return result;
});

const injectCustomStyles = () => {
  const formats = effectiveConfig.value.formats;
  if (!formats) return;

  const colorMode = useColorMode();
  const theme = colorMode.value as 'light' | 'dark';

  const styleId = 'custom-rich-text-formats';
  let styleEl = document.getElementById(styleId);

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  const cssRules: string[] = [];

  Object.keys(formats).forEach((key) => {
    const format = formats![key];
    if (!format) return;

    let cssStyles: Record<string, string> = {};
    if (format.css) {
      if (typeof format.css === 'function') {
        cssStyles = format.css(theme);
      } else {
        cssStyles = format.css;
      }
    }

    if (format.inline || (!format.block && !format.wrapper)) {
      const classSelector = `.${key}`;
      const styles = Object.entries(cssStyles).map(([k, v]) => `${camelToKebab(k)}: ${v}`).join('; ');
      if (styles) {
        cssRules.push(`${classSelector} { ${styles} }`);
      }
    } else if (format.block || format.wrapper) {
      const styles = Object.entries(cssStyles).map(([k, v]) => `${camelToKebab(k)}: ${v}`).join('; ');
      if (styles) {
        cssRules.push(`${key} { ${styles} }`);
      }
    }
  });

  styleEl.textContent = cssRules.join('\n');
};

const createCustomFormatsExtension = (): Extension => {
  const formats = effectiveConfig.value.formats;

  const extensions: any[] = [];
  const marks: any[] = [];
  const nodes: any[] = [];

  const colorMode = useColorMode();

  Object.keys(formats || {}).forEach((key) => {
    const format = formats![key];
    if (!format) return;

    const theme = colorMode.value as 'light' | 'dark';

    let classes: string[] = [];
    if (format.classes) {
      if (typeof format.classes === 'function') {
        const cls = format.classes(theme);
        classes = Array.isArray(cls) ? cls : [cls];
      } else {
        classes = Array.isArray(format.classes) ? format.classes : [format.classes];
      }
    }

    if (format.inline || (!format.block && !format.wrapper)) {
      const allClasses = [...classes, key].join(' ');
      marks.push(Mark.create({
        name: key,
        addAttributes() {
          const attrs: any = { ...format.attributes };
          if (allClasses) attrs.class = { default: allClasses };
          return attrs;
        },
        parseHTML() {
          return [
            {
              tag: 'span',
              getAttrs: (node: any) => {
                if (node.classList && node.classList.contains(key)) {
                  return {};
                }
                return false;
              },
            },
          ];
        },
        renderHTML({ HTMLAttributes }) {
          const attrs: any = {};
          if (allClasses) attrs.class = allClasses;
          return ['span', { ...attrs, ...HTMLAttributes }, 0];
        },
      }));
    } else if (format.block) {
      nodes.push(Node.create({
        name: key,
        addAttributes() {
          const attrs: any = { ...format.attributes };
          if (classes.length) attrs.class = { default: classes.join(' ') };
          return attrs;
        },
        content: 'inline*',
        group: 'block',
        parseHTML() {
          return [
            {
              tag: key,
            },
          ];
        },
        renderHTML({ HTMLAttributes }) {
          return [key, HTMLAttributes, 0];
        },
      }));
    } else if (format.wrapper !== undefined) {
      nodes.push(Node.create({
        name: key,
        addAttributes() {
          const attrs: any = { ...format.attributes };
          if (classes.length) attrs.class = { default: classes.join(' ') };
          return attrs;
        },
        content: 'block*',
        group: 'block',
        parseHTML() {
          return [
            {
              tag: key,
            },
          ];
        },
        renderHTML({ HTMLAttributes }) {
          return [key, HTMLAttributes, 0];
        },
      }));
    }
  });

  return Extension.create({
    name: 'customFormats',
    addExtensions() {
      return [...extensions, ...marks, ...nodes];
    },
  });
};

const editor = useEditor({
  content: ensureString(props.modelValue),
  extensions: [
    StarterKit.configure({
      codeBlock: false,
      link: false,
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
      },
      bulletList: {
        keepMarks: true,
        keepAttributes: false,
      },
      orderedList: {
        keepMarks: true,
        keepAttributes: false,
      },
    }) as AnyExtension,
    Placeholder.configure({
      placeholder: 'Type something...',
    }) as AnyExtension,
    Underline as AnyExtension,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
      alignments: ['left', 'center', 'right', 'justify'],
      defaultAlignment: 'left',
    }) as AnyExtension,
    Link.configure({
      openOnClick: false,
    }) as AnyExtension,
    Image.extend({
      addAttributes() {
        return {
          ...this.parent?.(),
          width: { default: null },
          height: { default: null },
        };
      },
    }) as AnyExtension,
    Table.configure({
      resizable: true,
    }) as AnyExtension,
    TableRow as AnyExtension,
    TableHeader as AnyExtension,
    TableCell as AnyExtension,
    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: 'auto',
    }) as AnyExtension,
    createCustomFormatsExtension(),
  ],
  editable: !props.disabled,
  onFocus: () => {
    isFocused.value = true;
  },
  onBlur: ({ editor }) => {
    isFocused.value = false;
    try {
      if (editor && isMounted.value) {
        emit('update:modelValue', editor.getHTML());
      }
    } catch {
    }
  },
  onDestroy: () => {
    isMounted.value = false;
  },
  onCreate: ({ editor }) => {
    if (editor) {
      isMounted.value = true;
    }
  },
});

watch(
  () => props.modelValue,
  (value) => {
    if (editor.value && value !== editor.value.getHTML()) {
      editor.value.commands.setContent(ensureString(value));
    }
  }
);

watch(
  () => props.disabled,
  (value) => {
    if (editor.value) {
      editor.value.setEditable(!value);
    }
  }
);

watch(
  effectiveConfig,
  () => {
    nextTick(() => {
      injectCustomStyles();
    });
  },
  { immediate: true, deep: true }
);

function handleMouseDown(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  isResizing.value = true;
  startY.value = e.clientY;
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect();
    startHeight.value = rect.height;

    previewStyle.value = {
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`
    };
  }

  document.addEventListener("mousemove", handleMouseMove, { passive: false });
  document.addEventListener("mouseup", handleMouseUp, { passive: false });
  document.addEventListener("mouseleave", handleMouseUp, { passive: false });

  if (resizeHandleRef.value) {
    resizeHandleRef.value.style.userSelect = "none";
  }

  if (containerRef.value) {
    containerRef.value.style.pointerEvents = "none";
  }

  document.body.style.userSelect = "none";
  document.body.style.cursor = "ns-resize";
}

function handleMouseMove(e: MouseEvent) {
  if (!isResizing.value || !containerRef.value) return;

  e.preventDefault();
  e.stopPropagation();

  const deltaY = e.clientY - startY.value;
  const newHeight = Math.max(minHeight.value, startHeight.value + deltaY);
  const heightStr = `${newHeight}px`;

  const rect = containerRef.value.getBoundingClientRect();
  previewStyle.value = {
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: heightStr
  };

  previewHeight.value = heightStr;
}

function handleMouseUp(e?: MouseEvent) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (!containerRef.value) return;

  const finalHeight = previewHeight.value || currentHeight.value;
  isResizing.value = false;
  previewHeight.value = null;
  previewStyle.value = null;

  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
  document.removeEventListener("mouseleave", handleMouseUp);

  if (resizeHandleRef.value) {
    resizeHandleRef.value.style.userSelect = "";
  }

  if (containerRef.value) {
    containerRef.value.style.pointerEvents = "";
  }

  document.body.style.userSelect = "";
  document.body.style.cursor = "";

  currentHeight.value = finalHeight;

  if (containerRef.value) {
    containerRef.value.style.height = finalHeight;
  }
}

watch(
  () => props.height,
  (newHeight) => {
    if (newHeight && !isResizing.value) {
      const heightStr = `${newHeight}px`;
      currentHeight.value = heightStr;
      if (containerRef.value) {
        containerRef.value.style.height = heightStr;
      }
    }
  }
);

onBeforeUnmount(() => {
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
  document.removeEventListener("mouseleave", handleMouseUp);
  document.body.style.userSelect = "";
  document.body.style.cursor = "";
  if (containerRef.value) {
    containerRef.value.style.pointerEvents = "";
  }
});

const isActive = (name: string, attributes = {}) => {
  return computed(() => {
    if (!editor.value) return false;
    try {
      return editor.value.isActive(name, attributes);
    } catch {
      return false;
    }
  });
};

const handleButtonClick = (action: () => void, event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
  try {
    action();
  } catch (error) {
    console.error('Action failed:', error);
  }
};

const getButtonClass = (active: boolean, disabled = false) => {
  return [
    'p-2 rounded transition-colors',
    disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 dark:hover:bg-gray-700',
    active ? 'bg-gray-300 dark:bg-gray-600' : '',
  ];
};

const setLink = () => {
  if (editor.value?.isActive('link')) {
    editor.value.chain().focus().unsetLink().run();
  } else {
    linkModalOpen.value = true;
  }
};

const confirmLink = () => {
  if (linkUrl.value && editor.value) {
    editor.value.chain().focus().setLink({ href: linkUrl.value }).run();
  }
  linkUrl.value = '';
  linkModalOpen.value = false;
};

const insertImage = () => {
  imageModalOpen.value = true;
};

const confirmImage = () => {
  if (imageUrl.value && editor.value) {
    editor.value.chain().focus().setImage({ src: imageUrl.value }).run();
  }
  imageUrl.value = '';
  imageModalOpen.value = false;
};

const insertTable = () => {
  editor.value?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
};

const toggleCodeBlock = () => {
  editor.value?.chain().focus().toggleCodeBlock().run();
};

const undo = () => {
  editor.value?.chain().focus().undo().run();
};

const redo = () => {
  editor.value?.chain().focus().redo().run();
};

const handleEditorClick = (event: MouseEvent) => {
  if (editor.value && !props.disabled) {
    const target = event.target as HTMLElement;
    if (target.closest('.ProseMirror')) {
      return;
    }
    editor.value.chain().focus().run();
  }
};

type ButtonConfig = {
  name: string;
  attrs?: any;
  icon: string;
  action: () => void;
  text?: string;
  tooltip?: string;
};

const availableButtons = computed<Record<string, ButtonConfig>>(() => {
  const customButtons = effectiveConfig.value.customButtons || [];
  const buttonActions = effectiveConfig.value.buttonActions || {};

  const baseButtons: Record<string, ButtonConfig> = {
    bold: { name: 'bold', icon: 'lucide:bold', action: () => editor.value?.chain().focus().toggleBold().run() },
    italic: { name: 'italic', icon: 'lucide:italic', action: () => editor.value?.chain().focus().toggleItalic().run() },
    underline: { name: 'underline', icon: 'lucide:underline', action: () => editor.value?.chain().focus().toggleUnderline().run() },
    strike: { name: 'strike', icon: 'lucide:strikethrough', action: () => editor.value?.chain().focus().toggleStrike().run() },
    code: { name: 'code', icon: 'lucide:code', action: () => editor.value?.chain().focus().toggleCode().run() },
    h1: { name: 'heading', attrs: { level: 1 }, icon: 'lucide:heading-1', action: () => editor.value?.chain().focus().toggleHeading({ level: 1 }).run() },
    h2: { name: 'heading', attrs: { level: 2 }, icon: 'lucide:heading-2', action: () => editor.value?.chain().focus().toggleHeading({ level: 2 }).run() },
    h3: { name: 'heading', attrs: { level: 3 }, icon: 'lucide:heading-3', action: () => editor.value?.chain().focus().toggleHeading({ level: 3 }).run() },
    h4: { name: 'heading', attrs: { level: 4 }, icon: 'lucide:heading-4', action: () => editor.value?.chain().focus().toggleHeading({ level: 4 }).run() },
    h5: { name: 'heading', attrs: { level: 5 }, icon: 'lucide:heading-5', action: () => editor.value?.chain().focus().toggleHeading({ level: 5 }).run() },
    h6: { name: 'heading', attrs: { level: 6 }, icon: 'lucide:heading-6', action: () => editor.value?.chain().focus().toggleHeading({ level: 6 }).run() },
    paragraph: { name: 'paragraph', icon: 'lucide:paragraph', action: () => editor.value?.chain().focus().setParagraph().run() },
    bullist: { name: 'bulletList', icon: 'lucide:list', action: () => editor.value?.chain().focus().toggleBulletList().run() },
    numlist: { name: 'orderedList', icon: 'lucide:list-ordered', action: () => editor.value?.chain().focus().toggleOrderedList().run() },
    alignleft: { name: 'textAlign', attrs: { align: 'left' }, icon: 'lucide:align-left', action: () => editor.value?.chain().focus().setTextAlign('left').run() },
    aligncenter: { name: 'textAlign', attrs: { align: 'center' }, icon: 'lucide:align-center', action: () => editor.value?.chain().focus().setTextAlign('center').run() },
    alignright: { name: 'textAlign', attrs: { align: 'right' }, icon: 'lucide:align-right', action: () => editor.value?.chain().focus().setTextAlign('right').run() },
    alignjustify: { name: 'textAlign', attrs: { align: 'justify' }, icon: 'lucide:align-justify', action: () => editor.value?.chain().focus().setTextAlign('justify').run() },
    link: { name: 'link', icon: 'lucide:link', action: setLink },
    image: { name: 'image', icon: 'lucide:image', action: insertImage },
    table: { name: 'table', icon: 'lucide:table', action: insertTable },
    blockquote: { name: 'blockquote', icon: 'lucide:quote', action: insertBlockquote },
    hr: { name: 'horizontalRule', icon: 'lucide:minus', action: insertHorizontalRule },
    codeblock: { name: 'codeBlock', icon: 'lucide:file-code', action: toggleCodeBlock },
    clear: { name: 'clearFormat', icon: 'lucide:eraser', action: clearFormat },
    undo: { name: 'undo', icon: 'lucide:undo', action: undo },
    redo: { name: 'redo', icon: 'lucide:redo', action: redo },
  };

  const customButtonsMap: Record<string, ButtonConfig> = {};

  customButtons.forEach((btn) => {
    const createAction = () => {
      if (btn.format && editor.value) {
        const formats = effectiveConfig.value.formats || {};
        const format = formats[btn.format];
        if (format) {
          if (format.inline || (!format.block && !format.wrapper)) {
            editor.value.chain().focus().toggleMark(btn.format).run();
          } else if (format.block) {
            const isActive = editor.value.isActive(btn.format);
            if (isActive) {
              editor.value.chain().focus().setNode('paragraph').run();
            } else {
              editor.value.chain().focus().setNode(btn.format).run();
            }
          } else if (format.wrapper) {
            const isActive = editor.value.isActive(btn.format);
            if (isActive) {
              editor.value.chain().focus().setNode('paragraph').run();
            } else {
              editor.value.chain().focus().wrapIn(btn.format).run();
            }
          }
        }
      } else if (btn.onAction) {
        if (typeof btn.onAction === 'function') {
          btn.onAction(editor.value);
        } else if (typeof btn.onAction === 'string') {
          const action = buttonActions[btn.onAction];
          if (action) {
            action(editor.value);
          }
        }
      }
    };

    customButtonsMap[btn.name] = {
      name: btn.name,
      icon: btn.icon || 'lucide:circle',
      text: btn.text,
      tooltip: btn.tooltip,
      action: createAction,
    };
  });

  return { ...baseButtons, ...customButtonsMap };
});

const getButtonConfig = (key: string): ButtonConfig | undefined => {
  return availableButtons.value[key];
};

const isButtonActive = (key: string): boolean => {
  const config = getButtonConfig(key);
  if (!config || !editor.value) return false;
  if (config.attrs) {
    return isActive(config.name, config.attrs).value;
  }
  return isActive(config.name).value;
};

onBeforeUnmount(() => {
  isMounted.value = false;
  const editorInstance = editor.value;
  if (editorInstance) {
    try {
      editorInstance.destroy();
    } catch {
    }
  }
});

onUnmounted(() => {
  isMounted.value = false;
});


</script>

<template>
  <div class="rich-text-editor">
    <Teleport to="body">
      <div
        v-if="isResizing && previewStyle"
        ref="previewLayerRef"
        class="fixed pointer-events-none z-50 border-2 border-dashed border-primary-500 dark:border-primary-400 bg-primary-500/5 dark:bg-primary-400/5 rounded-md"
        :style="previewStyle"
      ></div>
    </Teleport>

    <div
      v-if="editor"
      class="rich-text-editor-wrapper inline-block w-full"
      :class="[
        'rounded-md transition-all duration-200 ring-3',
        isFocused
          ? 'ring-primary z-10'
          : 'ring-gray-200 dark:ring-gray-700',
        props.disabled ? 'opacity-60 cursor-not-allowed' : '',
      ]"
    >
      <div
        ref="containerRef"
        class="overflow-hidden relative flex flex-col rounded-md transition-all duration-200"
        :class="[
          props.disabled ? 'bg-gray-50 dark:bg-gray-800/50' : '',
          !isResizing ? 'transition-[height] duration-300 ease-out' : ''
        ]"
        :style="{ height: currentHeight, minHeight: `${minHeight}px` }"
      >
      <div class="border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-2 flex flex-wrap gap-1 shrink-0"
           :class="{ 'pointer-events-none': props.disabled }">
        <template v-for="(group, groupIndex) in toolbarButtons" :key="'group-' + groupIndex">
          <div v-if="groupIndex > 0" class="w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
          <button
            v-for="key in group"
            :key="key"
            :class="[
              getButtonClass(isButtonActive(key), disabled),
              getButtonConfig(key)?.text ? 'px-2' : 'min-w-[32px]'
            ]"
            :disabled="disabled || !getButtonConfig(key)"
            :title="getButtonConfig(key)?.tooltip"
            class="flex items-center justify-center h-8"
            @click="getButtonConfig(key)?.action && handleButtonClick(getButtonConfig(key)!.action, $event)"
          >
            <template v-if="getButtonConfig(key)?.text">
              <span class="text-xs font-medium whitespace-nowrap">{{ getButtonConfig(key)?.text }}</span>
            </template>
            <template v-else-if="getButtonConfig(key)?.icon">
              <Icon :name="(getButtonConfig(key)?.icon) || 'lucide:help-circle'" class="w-4 h-4" />
            </template>
          </button>
        </template>
      </div>

      <div
        class="rich-text-editor-content-wrapper flex-1 overflow-y-auto relative"
        :class="{ 'pointer-events-none': props.disabled }"
        @click="handleEditorClick"
      >
        <EditorContent
          :editor="editor"
          class="rich-text-editor-content p-4 focus:outline-none h-full"
        />
      </div>

      <div
        ref="resizeHandleRef"
        @mousedown="handleMouseDown"
        class="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-gray-600/50 dark:hover:bg-gray-500/50 transition-colors group z-50 select-none"
        :class="{ 'bg-gray-600/50 dark:bg-gray-500/50': isResizing, 'pointer-events-none': props.disabled }"
        style="touch-action: none; pointer-events: auto;"
      >
        <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
          <div class="w-12 h-0.5 bg-gray-500 dark:bg-gray-400 group-hover:bg-gray-400 dark:group-hover:bg-gray-300 rounded-full"></div>
        </div>
      </div>
    </div>
    </div>

    <CommonModal v-model="linkModalOpen">
      <template #title>Add Link</template>
      <template #body>
        <div class="space-y-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">URL</label>
          <input
            v-model="linkUrl"
            type="text"
            placeholder="https://example.com"
            autofocus
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            @keydown.enter="confirmLink"
          />
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            @click="linkModalOpen = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            @click="confirmLink"
          >
            Add Link
          </button>
        </div>
      </template>
    </CommonModal>

    <CommonModal v-model="imageModalOpen">
      <template #title>Add Image</template>
      <template #body>
        <div class="space-y-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Image URL</label>
          <input
            v-model="imageUrl"
            type="text"
            placeholder="https://example.com/image.jpg"
            autofocus
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            @keydown.enter="confirmImage"
          />
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            @click="imageModalOpen = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            @click="confirmImage"
          >
            Add Image
          </button>
        </div>
      </template>
    </CommonModal>
  </div>
</template>
