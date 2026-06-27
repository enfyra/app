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
const tableMenuStyle = ref<{ top: string; left: string } | null>(null);
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

let lastEmittedHtml = ensureString(props.modelValue);

const editor = useEditor({
  content: lastEmittedHtml,
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
        const html = editor.getHTML();
        if (html !== lastEmittedHtml) {
          lastEmittedHtml = html;
          emit('update:modelValue', html);
        }
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
      lastEmittedHtml = editor.getHTML();
      canUndo.value = editor.can().undo();
      canRedo.value = editor.can().redo();
    }
  },
  onUpdate: ({ editor }) => {
    canUndo.value = editor.can().undo();
    canRedo.value = editor.can().redo();
    if (editor && isMounted.value) {
      const html = editor.getHTML();
      if (html !== lastEmittedHtml) {
        lastEmittedHtml = html;
        emit('update:modelValue', html);
      }
    }
  },
});

watch(
  () => props.modelValue,
  (value) => {
    if (editor.value && value !== editor.value.getHTML()) {
      const content = ensureString(value);
      editor.value.commands.setContent(content);
      lastEmittedHtml = editor.value.getHTML();
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
    disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--surface-muted)]',
    active ? 'bg-[var(--border-strong)]' : '',
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

const closeTableMenu = () => {
  tableMenuOpen.value = false;
  tableMenuStyle.value = null;
};

const addRowBefore = () => {
  editor.value?.chain().focus().addRowBefore().run();
};

const addRowAfter = () => {
  editor.value?.chain().focus().addRowAfter().run();
};

const deleteRow = () => {
  editor.value?.chain().focus().deleteRow().run();
};

const addColumnBefore = () => {
  editor.value?.chain().focus().addColumnBefore().run();
};

const addColumnAfter = () => {
  editor.value?.chain().focus().addColumnAfter().run();
};

const deleteColumn = () => {
  editor.value?.chain().focus().deleteColumn().run();
};

const deleteTable = () => {
  editor.value?.chain().focus().deleteTable().run();
};

const toggleHeaderColumn = () => {
  editor.value?.chain().focus().toggleHeaderColumn().run();
};

const toggleHeaderRow = () => {
  editor.value?.chain().focus().toggleHeaderRow().run();
};

const mergeCells = () => {
  editor.value?.chain().focus().mergeCells().run();
};

const splitCell = () => {
  editor.value?.chain().focus().splitCell().run();
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
      class="rich-text-editor-wrapper inline-block w-full relative rounded-lg border border-[var(--border-strong)] bg-transparent dark:bg-[var(--surface-muted)]"
      :class="[
        props.disabled ? 'cursor-not-allowed opacity-50 border-[var(--border-subtle)] bg-[var(--surface-muted)]' : '',
      ]"
    >
      <div
        ref="containerRef"
        class="relative flex flex-col rounded-lg overflow-hidden"
        :class="[
          props.disabled ? 'bg-[var(--surface-muted)]' : 'bg-transparent dark:bg-[var(--surface-muted)]',
          !isResizing ? 'transition-[height] duration-300 ease-out' : ''
        ]"
        :style="{ height: currentHeight, minHeight: `${minHeight}px` }"
      >
      <div class="border-b border-[var(--border-default)] bg-[var(--surface-muted)] p-2 flex items-start gap-1 shrink-0"
           :class="{ 'pointer-events-none': props.disabled }">
        <div class="flex flex-wrap gap-1 items-center flex-1">
          <template v-for="(group, groupIndex) in toolbarButtons" :key="'group-' + groupIndex">
            <div v-if="groupIndex > 0" class="w-px bg-[var(--border-default)] mx-1 self-stretch"></div>
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
        <div class="w-px bg-[var(--border-default)] self-stretch mx-1"></div>
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
        class="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-[var(--surface-muted)] transition-colors group z-50 select-none"
        :class="{ 'bg-[var(--surface-muted)]': isResizing, 'pointer-events-none': props.disabled }"
        style="touch-action: none; pointer-events: auto;"
      >
        <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
          <div class="w-12 h-0.5 bg-[var(--text-quaternary)] group-hover:bg-[var(--text-tertiary)] rounded-full"></div>
        </div>
      </div>
    </div>
    </div>

    <FormRichTextTableMenu
      v-if="tableMenuOpen"
      :style="tableMenuStyle"
      @close="closeTableMenu"
      @add-row-before="addRowBefore"
      @add-row-after="addRowAfter"
      @delete-row="deleteRow"
      @add-column-before="addColumnBefore"
      @add-column-after="addColumnAfter"
      @delete-column="deleteColumn"
      @toggle-header-row="toggleHeaderRow"
      @toggle-header-column="toggleHeaderColumn"
      @merge-cells="mergeCells"
      @split-cell="splitCell"
      @delete-table="deleteTable"
    />

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
