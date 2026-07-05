export type FileUploadProgressPhase =
  | "receiving"
  | "storing"
  | "completed"
  | "failed";

export interface FileUploadProgressEvent {
  uploadId: string;
  phase: FileUploadProgressPhase;
  loaded: number;
  total: number;
  percent: number;
  fileName?: string;
}
