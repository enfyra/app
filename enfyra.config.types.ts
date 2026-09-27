import type { RichTextEditorConfig } from "./app/types/rich-text-editor";

export type {
  RichTextEditorButtonConfig,
  RichTextEditorConfig,
  RichTextEditorController,
  RichTextEditorFormatConfig,
} from "./app/types/rich-text-editor";

export interface EnfyraConfig {
  richText?: RichTextEditorConfig;
}
