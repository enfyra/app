import type { RichTextEditorConfig } from "../../../enfyra.config.types";

type ResolvedCssStyles = {
  light?: Record<string, string>;
  dark?: Record<string, string>;
  shared?: Record<string, string>;
};

const METADATA_SCOPE = ".rich-text-editor .ProseMirror";

function camelToKebab(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

function resolveCssStyles(formatCss: any): ResolvedCssStyles {
  if (!formatCss) return {};
  if (typeof formatCss === "function") {
    const lightStyles = formatCss("light");
    const darkStyles = formatCss("dark");
    if (JSON.stringify(lightStyles) === JSON.stringify(darkStyles)) return { shared: lightStyles };
    return { light: lightStyles, dark: darkStyles };
  }
  if (formatCss.dark !== undefined || formatCss.light !== undefined) {
    const light = (formatCss.light && typeof formatCss.light === "object") ? formatCss.light : {};
    const dark = (formatCss.dark && typeof formatCss.dark === "object") ? formatCss.dark : {};
    return { light: Object.keys(light).length ? light : undefined, dark: Object.keys(dark).length ? dark : undefined };
  }
  return { shared: formatCss };
}

export function injectRichTextCustomStyles(config: RichTextEditorConfig) {
  const formats = config.formats;
  if (!formats) return;

  const styleId = "custom-rich-text-formats";
  let styleEl = document.getElementById(styleId);

  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  const cssRules: string[] = [];

  const toRule = (selector: string, stylesObj: Record<string, string>) => {
    const styles = Object.entries(stylesObj).map(([k, v]) => `${camelToKebab(k)}: ${v}`).join("; ");
    if (styles) cssRules.push(`${selector} { ${styles} }`);
  };

  Object.keys(formats).forEach((key) => {
    const format = formats[key];
    if (!format) return;

    const resolved = resolveCssStyles(format.css);

    const toSelector = (tag: string, isSpan: boolean) =>
      isSpan ? `${METADATA_SCOPE} .${key}` : `${METADATA_SCOPE} ${tag}`;

    if (format.inline) {
      const tag = format.tag || "span";
      const sel = toSelector(tag, tag === "span");
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

  styleEl.textContent = cssRules.join("\n");
}
