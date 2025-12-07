export interface RichTextEditorButtonConfig {
  name: string;
  text?: string;
  tooltip?: string;
  format?: string;
  onAction?: string | ((editor: any, params?: any) => void);
  params?: any[];
}

export interface RichTextEditorConfig {
  plugins?: string[];
  toolbar?: string;
  customButtons?: RichTextEditorButtonConfig[];
  buttonActions?: Record<string, (editor: any, params?: any) => void>;
  formats?: Record<string, { 
    styles?: Record<string, string> | ((theme: 'light' | 'dark') => Record<string, string>);
    attributes?: Record<string, string>;
  }>;
}

export interface EnfyraConfig {
  richText?: RichTextEditorConfig;
}

