export interface RichTextEditorController {
  focus(): void;
  getHTML(): string;
  setHTML(html: string): void;
  insertContent(content: string): void;
  toggleFormat(name: string): void;
  isFormatActive(name: string): boolean;
  undo(): void;
  redo(): void;
}

export interface RichTextEditorButtonConfig {
  name: string;
  text?: string;
  tooltip?: string;
  format?: string;
  icon?: string;
  onAction?: string | ((editor: RichTextEditorController, params?: unknown[]) => void);
  params?: unknown[];
}

export interface RichTextEditorFormatConfig {
  tag?: string;
  inline?: string | boolean;
  block?: string | boolean;
  wrapper?: boolean;
  classes?: string | string[] | ((theme: "light" | "dark") => string | string[]);
  css?: Record<string, string> | {
    dark?: Record<string, string>;
    light?: Record<string, string>;
  } | ((theme: "light" | "dark") => Record<string, string>);
  classStyles?: Record<string, Record<string, string> | ((theme: "light" | "dark") => Record<string, string>)>;
  attributes?: Record<string, string>;
}

export interface RichTextEditorConfig {
  plugins?: string[];
  toolbar?: string;
  customButtons?: RichTextEditorButtonConfig[];
  buttonActions?: Record<string, (editor: RichTextEditorController, params?: unknown[]) => void>;
  formats?: Record<string, RichTextEditorFormatConfig>;
}
