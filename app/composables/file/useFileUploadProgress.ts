import type { Socket } from "socket.io-client";
import type { FileUploadProgressEvent, FileUploadProgressPhase } from "~/types";

const FILE_UPLOAD_PROGRESS_EVENT = "$system:file-upload:progress";

type UploadProgressSegment = {
  basePercent?: number;
  weightPercent?: number;
};

function createUploadId() {
  if (import.meta.client && typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useFileUploadProgress() {
  const uploadId = ref<string | null>(null);
  const uploadProgress = ref<number | null>(null);
  const uploadPhase = ref<FileUploadProgressPhase | null>(null);
  const segmentBasePercent = ref(0);
  const segmentWeightPercent = ref(100);
  let adminSocket: Socket | null = null;

  const handleProgress = (event: FileUploadProgressEvent) => {
    if (!event?.uploadId || event.uploadId !== uploadId.value) return;
    const rawPercent = Math.min(100, Math.max(0, Math.round(event.percent)));
    uploadPhase.value = event.phase;
    uploadProgress.value = Math.min(
      100,
      Math.round(segmentBasePercent.value + (rawPercent / 100) * segmentWeightPercent.value),
    );
  };

  const ensureListener = () => {
    if (!import.meta.client) return;
    adminSocket = useAdminSocket().adminSocket as Socket;
    adminSocket.off(FILE_UPLOAD_PROGRESS_EVENT, handleProgress);
    adminSocket.on(FILE_UPLOAD_PROGRESS_EVENT, handleProgress);
  };

  const beginUploadProgress = (segment: UploadProgressSegment = {}) => {
    const nextId = createUploadId();
    segmentBasePercent.value = Math.min(100, Math.max(0, segment.basePercent ?? 0));
    segmentWeightPercent.value = Math.min(100, Math.max(0, segment.weightPercent ?? 100));
    uploadId.value = nextId;
    uploadProgress.value = Math.round(segmentBasePercent.value);
    uploadPhase.value = "receiving";
    ensureListener();
    return nextId;
  };

  const resetUploadProgress = () => {
    uploadId.value = null;
    uploadProgress.value = null;
    uploadPhase.value = null;
    segmentBasePercent.value = 0;
    segmentWeightPercent.value = 100;
  };

  const uploadProgressHeaders = computed<Record<string, string>>(() =>
    uploadId.value
      ? { "x-enfyra-upload-id": uploadId.value }
      : {} as Record<string, string>,
  );

  onMounted(ensureListener);
  onUnmounted(() => {
    adminSocket?.off(FILE_UPLOAD_PROGRESS_EVENT, handleProgress);
  });

  return {
    uploadId,
    uploadProgress,
    uploadPhase,
    uploadProgressHeaders,
    beginUploadProgress,
    resetUploadProgress,
  };
}
