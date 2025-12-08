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
    inline?: string | boolean;
    block?: string | boolean;
    wrapper?: boolean;
    classes?: string | string[] | ((theme: 'light' | 'dark') => string | string[]);
    css?: Record<string, string> | ((theme: 'light' | 'dark') => Record<string, string>);
    classStyles?: Record<string, Record<string, string> | ((theme: 'light' | 'dark') => Record<string, string>)>;
    attributes?: Record<string, string>;
  }>;
}

export interface EnfyraConfig {
  richText?: RichTextEditorConfig;
}

