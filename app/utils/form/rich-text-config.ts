import type { RichTextEditorConfig } from "~/types/rich-text-editor";

export const DEFAULT_RICH_TEXT_TOOLBAR = "undo redo | headings lists blockquote codeblock | bold italic underline strike code | link image table | align";

const PLUGIN_BY_BUTTON: Record<string, string> = {
  link: "link",
  bullist: "lists",
  numlist: "lists",
  table: "table",
  codeblock: "code",
  lists: "lists",
};

export function mergeRichTextEditorConfig(
  base: RichTextEditorConfig = {},
  override: RichTextEditorConfig = {},
): RichTextEditorConfig {
  const customButtons = override.customButtons ?? base.customButtons ?? [];
  const configuredToolbar = override.toolbar ?? base.toolbar;
  const toolbar = configuredToolbar ?? [
    DEFAULT_RICH_TEXT_TOOLBAR,
    customButtons.length > 0 ? customButtons.map(({ name }) => name).join(" ") : "",
  ].filter(Boolean).join(" | ");

  return {
    ...base,
    ...override,
    toolbar,
    customButtons,
    formats: {
      ...(base.formats ?? {}),
      ...(override.formats ?? {}),
    },
    buttonActions: {
      ...(base.buttonActions ?? {}),
      ...(override.buttonActions ?? {}),
    },
  };
}

export function getRichTextToolbarGroups(config: RichTextEditorConfig): string[][] {
  const enabledPlugins = config.plugins ? new Set(config.plugins) : null;
  const toolbar = config.toolbar ?? DEFAULT_RICH_TEXT_TOOLBAR;

  return toolbar
    .split("|")
    .map((group) => group.trim().split(/\s+/).filter(Boolean))
    .map((group) => group.filter((key) => {
      const plugin = PLUGIN_BY_BUTTON[key];
      return !plugin || !enabledPlugins || enabledPlugins.has(plugin);
    }))
    .filter((group) => group.length > 0);
}

export function normalizeRichTextHtml(html: string): string {
  return html.replace(
    /<div\s+data-type=(?:"horizontalRule"|'horizontalRule')\s*>\s*<hr\s*\/?>(?:\s*)<\/div>/gi,
    "<hr>",
  );
}
