import { Extension, Mark, Node, type AnyExtension } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import type { RichTextEditorConfig, RichTextEditorFormatConfig } from "~/types/rich-text-editor";

const tableSpanAttributes = {
  colspan: {
    default: 1,
    parseHTML: (element: HTMLElement) => element.getAttribute("colspan") || 1,
    renderHTML: (attributes: Record<string, unknown>) => {
      if (attributes.colspan === 1) return {};
      return { colspan: attributes.colspan };
    },
  },
  rowspan: {
    default: 1,
    parseHTML: (element: HTMLElement) => element.getAttribute("rowspan") || 1,
    renderHTML: (attributes: Record<string, unknown>) => {
      if (attributes.rowspan === 1) return {};
      return { rowspan: attributes.rowspan };
    },
  },
  colwidth: {
    default: null,
    parseHTML: (element: HTMLElement) => {
      const style = element.getAttribute("style") || "";
      const match = style.match(/width:\s*(\d+(?:\.\d+)?)/i);
      if (match?.[1]) return [Number.parseInt(match[1], 10)];
      const colwidth = element.getAttribute("colwidth");
      return colwidth ? [Number.parseInt(colwidth, 10)] : null;
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const colwidth = attributes.colwidth;
      if (!Array.isArray(colwidth) || colwidth.length === 0) return {};
      return { style: `width: ${colwidth[0]}px` };
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

function resolveFormatClasses(
  key: string,
  format: RichTextEditorFormatConfig,
  theme: "light" | "dark",
): string {
  if (!format.classes) return "";
  const resolved = typeof format.classes === "function"
    ? format.classes(theme)
    : format.classes;
  const classes = Array.isArray(resolved) ? resolved : [resolved];
  return classes.filter(Boolean).join(" ");
}

function getFormatAttributes(
  key: string,
  format: RichTextEditorFormatConfig,
  theme: "light" | "dark",
): Record<string, { default: string }> {
  const attributes = Object.fromEntries(
    Object.entries(format.attributes ?? {}).map(([name, value]) => [name, { default: value }]),
  );
  const classes = resolveFormatClasses(key, format, theme);
  const tag = format.tag || (format.inline ? "span" : key);
  const className = [classes, tag === "span" || !format.tag ? key : ""]
    .filter(Boolean)
    .join(" ");

  if (className) attributes.class = { default: className };
  return attributes;
}

function createCustomFormatsExtension(
  config: RichTextEditorConfig,
  theme: "light" | "dark",
): Extension {
  const marks: AnyExtension[] = [];
  const nodes: AnyExtension[] = [];

  Object.entries(config.formats ?? {}).forEach(([key, format]) => {
    if (!format) return;

    const tag = format.tag || (format.inline ? "span" : key);
    const attributes = getFormatAttributes(key, format, theme);

    if (format.inline) {
      marks.push(Mark.create({
        name: key,
        addAttributes() {
          return attributes;
        },
        parseHTML() {
          return [{
            tag,
            getAttrs: (node) => {
              if (tag !== "span" || node.classList.contains(key)) return {};
              return false;
            },
          }];
        },
        renderHTML({ HTMLAttributes }) {
          return [tag, HTMLAttributes, 0];
        },
      }));
      return;
    }

    nodes.push(Node.create({
      name: key,
      content: format.wrapper ? "block*" : "inline*",
      group: "block",
      addAttributes() {
        return attributes;
      },
      parseHTML() {
        return [{ tag }];
      },
      renderHTML({ HTMLAttributes }) {
        return [tag, HTMLAttributes, 0];
      },
    }));
  });

  return Extension.create({
    name: "enfyraCustomFormats",
    addExtensions() {
      return [...marks, ...nodes];
    },
  });
}

export function buildRichTextExtensions(
  config: RichTextEditorConfig,
  lowlight: unknown,
  theme: "light" | "dark",
): AnyExtension[] {
  const enabledPlugins = config.plugins ? new Set(config.plugins) : null;
  const isEnabled = (plugin: string) => enabledPlugins === null || enabledPlugins.has(plugin);
  const extensions: AnyExtension[] = [
    TextAlign.configure({
      types: ["heading", "paragraph"],
      alignments: ["left", "center", "right", "justify"],
      defaultAlignment: "left",
    }),
  ];

  if (isEnabled("table")) {
    extensions.push(
      Table.configure({
        resizable: true,
        handleWidth: 5,
        cellMinWidth: 50,
        lastColumnResizable: true,
      }),
      TableRow,
      CustomTableHeader,
      CustomTableCell,
    );
  }

  if (isEnabled("code")) {
    extensions.push(CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: "auto",
    }));
  }

  extensions.push(createCustomFormatsExtension(config, theme));
  return extensions;
}
