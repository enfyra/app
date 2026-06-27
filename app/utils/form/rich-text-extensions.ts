import { Extension, Mark, Node, type AnyExtension } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import type { RichTextEditorConfig } from "../../../enfyra.config.types";

const tableSpanAttributes = {
  colspan: {
    default: 1,
    parseHTML: (element: HTMLElement) => element.getAttribute("colspan") || 1,
    renderHTML: (attributes: Record<string, any>) => {
      if (attributes.colspan === 1) return {};
      return { colspan: attributes.colspan };
    },
  },
  rowspan: {
    default: 1,
    parseHTML: (element: HTMLElement) => element.getAttribute("rowspan") || 1,
    renderHTML: (attributes: Record<string, any>) => {
      if (attributes.rowspan === 1) return {};
      return { rowspan: attributes.rowspan };
    },
  },
  colwidth: {
    default: null,
    parseHTML: (element: HTMLElement) => {
      const style = element.getAttribute("style") || "";
      const match = style.match(/width:\s*(\d+(?:\.\d+)?)/i);
      if (match?.[1]) return [parseInt(match[1])];
      const colwidth = element.getAttribute("colwidth");
      return colwidth ? [parseInt(colwidth)] : null;
    },
    renderHTML: (attributes: Record<string, any>) => {
      if (!attributes.colwidth || attributes.colwidth.length === 0) return {};
      const width = attributes.colwidth[0];
      return { style: `width: ${width}px` };
    },
  },
};

const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...tableSpanAttributes,
    };
  },
});

const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...tableSpanAttributes,
    };
  },
});

function createCustomFormatsExtension(config: RichTextEditorConfig, theme: "light" | "dark"): Extension {
  const formats = config.formats;
  const marks: any[] = [];
  const nodes: any[] = [];

  Object.keys(formats || {}).forEach((key) => {
    const format = formats![key];
    if (!format) return;

    let classes: string[] = [];
    if (format.classes) {
      if (typeof format.classes === "function") {
        const cls = format.classes(theme);
        classes = Array.isArray(cls) ? cls : [cls];
      } else {
        classes = Array.isArray(format.classes) ? format.classes : [format.classes];
      }
    }

    if (format.inline) {
      const tag = format.tag || "span";
      const shouldAddKeyClass = tag === "span";
      const allClasses = shouldAddKeyClass ? [...classes, key].join(" ") : classes.join(" ");
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
                if (tag !== "span" || (node.classList && node.classList.contains(key))) {
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
      const allClasses = shouldAddKeyClass ? [...classes, key].join(" ") : classes.join(" ");
      nodes.push(Node.create({
        name: key,
        addAttributes() {
          const attrs: any = { ...format.attributes };
          if (allClasses) attrs.class = { default: allClasses };
          return attrs;
        },
        content: "block*",
        group: "block",
        parseHTML() {
          return [{ tag }];
        },
        renderHTML({ HTMLAttributes }) {
          return [tag, HTMLAttributes, 0];
        },
      }));
    } else {
      const tag = format.tag || key;
      const shouldAddKeyClass = !format.tag;
      const allClasses = shouldAddKeyClass ? [...classes, key].join(" ") : classes.join(" ");
      nodes.push(Node.create({
        name: key,
        addAttributes() {
          const attrs: any = { ...format.attributes };
          if (allClasses) attrs.class = { default: allClasses };
          return attrs;
        },
        content: "inline*",
        group: "block",
        parseHTML() {
          return [{ tag }];
        },
        renderHTML({ HTMLAttributes }) {
          return [tag, HTMLAttributes, 0];
        },
      }));
    }
  });

  return Extension.create({
    name: "customFormats",
    addExtensions() {
      return [...marks, ...nodes];
    },
  });
}

export function buildRichTextExtensions(config: RichTextEditorConfig, lowlight: any, theme: "light" | "dark"): AnyExtension[] {
  return [
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
      placeholder: "Type something...",
    }) as AnyExtension,
    Underline,
    TextAlign.configure({
      types: ["heading", "paragraph"],
      alignments: ["left", "center", "right", "justify"],
      defaultAlignment: "left",
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
      defaultLanguage: "auto",
    }) as AnyExtension,
    createCustomFormatsExtension(config, theme),
  ];
}
