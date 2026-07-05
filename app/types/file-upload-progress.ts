export type FileUploadProgressPhase =
  | "receiving"
  | "completed"
  | "failed";

export interface FileUploadProgressEvent {
  uploadId: string;
  phase: FileUploadProgressPhase;
  loaded: number;
  total: number;
  percent: number;
  fileName?: string;
  route?: string;
  method?: string;
}
