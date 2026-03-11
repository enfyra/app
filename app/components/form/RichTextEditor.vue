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

const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      colspan: {
        default: 1,
        parseHTML: (element) => element.getAttribute('colspan') || 1,
        renderHTML: (attributes) => {
          if (attributes.colspan === 1) return {}
          return { colspan: attributes.colspan }
        },
      },
      rowspan: {
        default: 1,
        parseHTML: (element) => element.getAttribute('rowspan') || 1,
        renderHTML: (attributes) => {
          if (attributes.rowspan === 1) return {}
          return { rowspan: attributes.rowspan }
        },
      },
      colwidth: {
        default: null,
        parseHTML: (element) => {
          const style = element.getAttribute('style') || ''
          const match = style.match(/width:\s*(\d+(?:\.\d+)?)/i)
          if (match && match[1]) {
            return [parseInt(match[1])]
          }
          const colwidth = element.getAttribute('colwidth')
          return colwidth ? [parseInt(colwidth)] : null
        },
        renderHTML: (attributes) => {
          if (!attributes.colwidth || attributes.colwidth.length === 0) return {}
          const width = attributes.colwidth[0]
          return { style: `width: ${width}px` }
        },
      },
    }
  },
})

const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      colspan: {
        default: 1,
        parseHTML: (element) => element.getAttribute('colspan') || 1,
        renderHTML: (attributes) => {
          if (attributes.colspan === 1) return {}
          return { colspan: attributes.colspan }
        },
      },
      rowspan: {
        default: 1,
        parseHTML: (element) => element.getAttribute('rowspan') || 1,
        renderHTML: (attributes) => {
          if (attributes.rowspan === 1) return {}
          return { rowspan: attributes.rowspan }
        },
      },
      colwidth: {
        default: null,
        parseHTML: (element) => {
          const style = element.getAttribute('style') || ''
          const match = style.match(/width:\s*(\d+(?:\.\d+)?)/i)
          if (match && match[1]) {
            return [parseInt(match[1])]
          }
          const colwidth = element.getAttribute('colwidth')
          return colwidth ? [parseInt(colwidth)] : null
        },
        renderHTML: (attributes) => {
          if (!attributes.colwidth || attributes.colwidth.length === 0) return {}
          const width = attributes.colwidth[0]
          return { style: `width: ${width}px` }
        },
      },
    }
  },
})
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
const tableMenuOpen = ref(false);
const tableMenuRef = ref<HTMLDivElement>();
const tableMenuStyle = ref<{ top: string; left: string } | null>(null);
const tableModifyModalOpen = ref(false);
const linkUrl = ref('');
const imageUrl = ref('');
const canUndo = ref(false);
const canRedo = ref(false);

type ButtonGroup = string[];

const effectiveConfig = computed<RichTextEditorConfig>(() => {
  const base = enfyraConfig.richText || {};
  const override = props.editorConfig || {};

  const defaultToolbar = 'clear | h1 h2 h3 h4 h5 h6 | bold italic underline strike | bullist numlist | alignleft aligncenter alignright alignjustify | link image table blockquote hr';

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

function resolveCssStyles(formatCss: any): { light?: Record<string, string>; dark?: Record<string, string>; shared?: Record<string, string> } {
  if (!formatCss) return {};
  if (typeof formatCss === 'function') {
    const lightStyles = formatCss('light');
    const darkStyles = formatCss('dark');
    if (JSON.stringify(lightStyles) === JSON.stringify(darkStyles)) return { shared: lightStyles };
    return { light: lightStyles, dark: darkStyles };
  }
  if (formatCss.dark !== undefined || formatCss.light !== undefined) {
    const light = (formatCss.light && typeof formatCss.light === 'object') ? formatCss.light : {};
    const dark = (formatCss.dark && typeof formatCss.dark === 'object') ? formatCss.dark : {};
    return { light: Object.keys(light).length ? light : undefined, dark: Object.keys(dark).length ? dark : undefined };
  }
  return { shared: formatCss };
}

const METADATA_SCOPE = '.rich-text-editor .ProseMirror';

const injectCustomStyles = () => {
  const formats = effectiveConfig.value.formats;
  if (!formats) return;

  const styleId = 'custom-rich-text-formats';
  let styleEl = document.getElementById(styleId);

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  const cssRules: string[] = [];

  const toRule = (selector: string, stylesObj: Record<string, string>) => {
    const styles = Object.entries(stylesObj).map(([k, v]) => `${camelToKebab(k)}: ${v}`).join('; ');
    if (styles) cssRules.push(`${selector} { ${styles} }`);
  };

  Object.keys(formats).forEach((key) => {
    const format = formats![key];
    if (!format) return;

    const resolved = resolveCssStyles(format.css);

    const toSelector = (tag: string, isSpan: boolean) =>
      isSpan ? `${METADATA_SCOPE} .${key}` : `${METADATA_SCOPE} ${tag}`;

    if (format.inline) {
      const tag = format.tag || 'span';
      const sel = toSelector(tag, tag === 'span');
      if (resolved.shared) toRule(sel, resolved.shared);
      if (resolved.light) toRule(`html:not(.dark) ${sel}`, resolved.light);
      if (resolved.dark) toRule(`html.dark ${sel}`, resolved.dark);
    } else {
      const tag = format.tag || key;
      const sel = `${METADATA_SCOPE} ${tag}`;
      if (resolved.shared) toRule(sel, resolved.shared);
      if (resolved.light) toRule(`html:not(.dark) ${sel}`, resolved.light);
      if (resolved.dark) toRule(`html.dark ${sel}`, resolved.dark);
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

    if (format.inline) {
      const tag = format.tag || 'span';
      const shouldAddKeyClass = tag === 'span';
      const allClasses = shouldAddKeyClass ? [...classes, key].join(' ') : classes.join(' ');
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
              tag,
              getAttrs: (node: any) => {
                if (tag !== 'span' || (node.classList && node.classList.contains(key))) {
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
          return [tag, { ...attrs, ...HTMLAttributes }, 0];
        },
      }));
    } else if (format.wrapper) {
      const tag = format.tag || key;
      const shouldAddKeyClass = !format.tag;
      const allClasses = shouldAddKeyClass ? [...classes, key].join(' ') : classes.join(' ');
      nodes.push(Node.create({
        name: key,
        addAttributes() {
          const attrs: any = { ...format.attributes };
          if (allClasses) attrs.class = { default: allClasses };
          return attrs;
        },
        content: 'block*',
        group: 'block',
        parseHTML() {
          return [
            {
              tag,
            },
          ];
        },
        renderHTML({ HTMLAttributes }) {
          return [tag, HTMLAttributes, 0];
        },
      }));
    } else {
      const tag = format.tag || key;
      const shouldAddKeyClass = !format.tag;
      const allClasses = shouldAddKeyClass ? [...classes, key].join(' ') : classes.join(' ');
      nodes.push(Node.create({
        name: key,
        addAttributes() {
          const attrs: any = { ...format.attributes };
          if (allClasses) attrs.class = { default: allClasses };
          return attrs;
        },
        content: 'inline*',
        group: 'block',
        parseHTML() {
          return [
            {
              tag,
            },
          ];
        },
        renderHTML({ HTMLAttributes }) {
          return [tag, HTMLAttributes, 0];
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
      code: false,
      underline: false,
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
    Underline,
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
      handleWidth: 5,
      cellMinWidth: 50,
      lastColumnResizable: true,
    }) as AnyExtension,
    TableRow as AnyExtension,
    CustomTableHeader as AnyExtension,
    CustomTableCell as AnyExtension,
    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: 'auto',
    }) as AnyExtension,
    createCustomFormatsExtension(),
  ],
  editable: !props.disabled,
  onBlur: ({ editor }) => {
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
      canUndo.value = editor.can().undo();
      canRedo.value = editor.can().redo();
    }
  },
  onUpdate: ({ editor }) => {
    canUndo.value = editor.can().undo();
    canRedo.value = editor.can().redo();
    if (editor && isMounted.value) {
      emit('update:modelValue', editor.getHTML());
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
  if (editor.value?.isActive('table')) {
    tableMenuOpen.value = !tableMenuOpen.value;
    if (tableMenuOpen.value) {
      nextTick(() => {
        const tableButton = document.querySelector('[data-table-button]') as HTMLElement;
        if (tableButton) {
          const rect = tableButton.getBoundingClientRect();
          tableMenuStyle.value = {
            top: `${rect.bottom + 8}px`,
            left: `${rect.left}px`,
          };
        }
      });
    } else {
      tableMenuStyle.value = null;
    }
  } else {
    editor.value?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }
};

const addRowBefore = () => {
  editor.value?.chain().focus().addRowBefore().run();
  tableModifyModalOpen.value = false;
};

const addRowAfter = () => {
  editor.value?.chain().focus().addRowAfter().run();
  tableModifyModalOpen.value = false;
};

const deleteRow = () => {
  editor.value?.chain().focus().deleteRow().run();
  tableModifyModalOpen.value = false;
};

const addColumnBefore = () => {
  editor.value?.chain().focus().addColumnBefore().run();
  tableModifyModalOpen.value = false;
};

const addColumnAfter = () => {
  editor.value?.chain().focus().addColumnAfter().run();
  tableModifyModalOpen.value = false;
};

const deleteColumn = () => {
  editor.value?.chain().focus().deleteColumn().run();
  tableModifyModalOpen.value = false;
};

const deleteTable = () => {
  editor.value?.chain().focus().deleteTable().run();
  tableModifyModalOpen.value = false;
};

const toggleHeaderColumn = () => {
  editor.value?.chain().focus().toggleHeaderColumn().run();
  tableModifyModalOpen.value = false;
};

const toggleHeaderRow = () => {
  editor.value?.chain().focus().toggleHeaderRow().run();
  tableModifyModalOpen.value = false;
};

const mergeCells = () => {
  editor.value?.chain().focus().mergeCells().run();
  tableModifyModalOpen.value = false;
};

const splitCell = () => {
  editor.value?.chain().focus().splitCell().run();
  tableModifyModalOpen.value = false;
};

const applyTableSize = () => {
  tableModifyModalOpen.value = false;
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
  format?: string;
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
          if (format.inline) {
            editor.value.chain().focus().toggleMark(btn.format).run();
          } else if (format.wrapper) {
            const isActive = editor.value.isActive(btn.format);
            if (isActive) {
              editor.value.chain().focus().setNode('paragraph').run();
            } else {
              editor.value.chain().focus().wrapIn(btn.format).run();
            }
          } else {
            const isActive = editor.value.isActive(btn.format);
            if (isActive) {
              editor.value.chain().focus().setNode('paragraph').run();
            } else {
              editor.value.chain().focus().setNode(btn.format).run();
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
      format: btn.format,
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
  const checkName = config.format || config.name;
  if (config.attrs) {
    return isActive(checkName, config.attrs).value;
  }
  return isActive(checkName).value;
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

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target;
  if (tableMenuRef.value && target instanceof window.Node && !tableMenuRef.value.contains(target)) {
    tableMenuOpen.value = false;
    tableMenuStyle.value = null;
  }
};

watch(tableMenuOpen, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      document.addEventListener('click', handleClickOutside);
    });
  } else {
    document.removeEventListener('click', handleClickOutside);
  }
});

onUnmounted(() => {
  isMounted.value = false;
  document.removeEventListener('click', handleClickOutside);
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
      class="rich-text-editor-wrapper inline-block w-full relative rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:bg-gray-900"
      :class="[
        props.disabled ? 'cursor-not-allowed opacity-50 border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03]' : '',
      ]"
    >
      <div
        ref="containerRef"
        class="relative flex flex-col rounded-lg overflow-hidden"
        :class="[
          props.disabled ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-transparent dark:bg-gray-900',
          !isResizing ? 'transition-[height] duration-300 ease-out' : ''
        ]"
        :style="{ height: currentHeight, minHeight: `${minHeight}px` }"
      >
      <div class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2 flex items-start gap-1 shrink-0"
           :class="{ 'pointer-events-none': props.disabled }">
        <div class="flex flex-wrap gap-1 items-center flex-1">
          <template v-for="(group, groupIndex) in toolbarButtons" :key="'group-' + groupIndex">
            <div v-if="groupIndex > 0" class="w-px bg-gray-200 dark:bg-gray-700 mx-1 self-stretch"></div>
            <button
              v-for="key in group"
              :key="key"
              :data-table-button="key === 'table' ? '' : undefined"
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
        <div class="w-px bg-gray-200 dark:bg-gray-700 self-stretch mx-1"></div>
        <div class="flex gap-1 shrink-0 items-center">
          <button
            :class="getButtonClass(false, disabled || !canUndo)"
            :disabled="disabled || !canUndo"
            title="Undo"
            class="flex items-center justify-center h-8 min-w-[32px]"
            @click="undo"
          >
            <Icon name="lucide:undo" class="w-4 h-4" />
          </button>
          <button
            :class="getButtonClass(false, disabled || !canRedo)"
            :disabled="disabled || !canRedo"
            title="Redo"
            class="flex items-center justify-center h-8 min-w-[32px]"
            @click="redo"
          >
            <Icon name="lucide:redo" class="w-4 h-4" />
          </button>
        </div>
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

    <Teleport to="body">
      <div
        v-if="tableMenuOpen && tableMenuStyle"
        ref="tableMenuRef"
        class="fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg py-1 min-w-[180px]"
        :style="{ top: tableMenuStyle.top, left: tableMenuStyle.left, maxHeight: '300px', overflowY: 'auto' }"
        @click.stop
      >
        <div class="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
          Table Options
        </div>
        <button
          @click="addRowBefore"
          class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
        >
          <Icon name="lucide:arrow-up" class="w-4 h-4" />
          Add Row Before
        </button>
        <button
          @click="addRowAfter"
          class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
        >
          <Icon name="lucide:arrow-down" class="w-4 h-4" />
          Add Row After
        </button>
        <button
          @click="deleteRow"
          class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
        >
          <Icon name="lucide:trash-2" class="w-4 h-4" />
          Delete Row
        </button>
        <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
        <button
          @click="addColumnBefore"
          class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
        >
          <Icon name="lucide:arrow-left" class="w-4 h-4" />
          Add Column Before
        </button>
        <button
          @click="addColumnAfter"
          class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
        >
          <Icon name="lucide:arrow-right" class="w-4 h-4" />
          Add Column After
        </button>
        <button
          @click="deleteColumn"
          class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
        >
          <Icon name="lucide:trash-2" class="w-4 h-4" />
          Delete Column
        </button>
        <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
        <button
          @click="toggleHeaderRow"
          class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
        >
          <Icon name="lucide:panel-top" class="w-4 h-4" />
          Toggle Header Row
        </button>
        <button
          @click="toggleHeaderColumn"
          class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
        >
          <Icon name="lucide:columns" class="w-4 h-4" />
          Toggle Header Column
        </button>
        <button
          @click="mergeCells"
          class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
        >
          <Icon name="lucide:combine" class="w-4 h-4" />
          Merge Cells
        </button>
        <button
          @click="splitCell"
          class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
        >
          <Icon name="lucide:square" class="w-4 h-4" />
          Split Cell
        </button>
        <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
        <button
          @click="deleteTable"
          class="w-full px-3 py-2 text-left text-sm hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center gap-2"
        >
          <Icon name="lucide:trash" class="w-4 h-4" />
          Delete Table
        </button>
      </div>
    </Teleport>


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

    <CommonModal v-model="tableModifyModalOpen">
      <template #title>Table Settings</template>
      <template #body>
        <div class="grid grid-cols-3 gap-2">
          <button
            @click="addRowBefore"
            class="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Icon name="lucide:arrow-up" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span class="text-xs text-gray-600 dark:text-gray-300">Row Above</span>
          </button>
          <button
            @click="addRowAfter"
            class="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Icon name="lucide:arrow-down" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span class="text-xs text-gray-600 dark:text-gray-300">Row Below</span>
          </button>
          <button
            @click="deleteRow"
            class="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Icon name="lucide:trash-2" class="w-5 h-5 text-red-500 dark:text-red-400" />
            <span class="text-xs text-red-600 dark:text-red-400">Delete Row</span>
          </button>
          <button
            @click="addColumnBefore"
            class="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Icon name="lucide:arrow-left" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span class="text-xs text-gray-600 dark:text-gray-300">Col Left</span>
          </button>
          <button
            @click="addColumnAfter"
            class="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Icon name="lucide:arrow-right" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span class="text-xs text-gray-600 dark:text-gray-300">Col Right</span>
          </button>
          <button
            @click="deleteColumn"
            class="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Icon name="lucide:trash-2" class="w-5 h-5 text-red-500 dark:text-red-400" />
            <span class="text-xs text-red-600 dark:text-red-400">Delete Col</span>
          </button>
          <button
            @click="toggleHeaderRow"
            class="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Icon name="lucide:panel-top" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span class="text-xs text-gray-600 dark:text-gray-300">Header Row</span>
          </button>
          <button
            @click="mergeCells"
            class="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Icon name="lucide:merge" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span class="text-xs text-gray-600 dark:text-gray-300">Merge</span>
          </button>
          <button
            @click="splitCell"
            class="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Icon name="lucide:split" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span class="text-xs text-gray-600 dark:text-gray-300">Split</span>
          </button>
        </div>
        <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            @click="deleteTable"
            class="w-full flex items-center justify-center gap-2 p-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Icon name="lucide:trash" class="w-5 h-5" />
            <span class="font-medium">Delete Table</span>
          </button>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end">
          <UButton
            variant="ghost"
            color="neutral"
            @click="tableModifyModalOpen = false"
          >
            Close
          </UButton>
        </div>
      </template>
    </CommonModal>
  </div>
</template>
