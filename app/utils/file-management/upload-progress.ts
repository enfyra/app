import type { FileUploadProgressEvent } from '~/types/file-upload-progress';

export function isFileUploadProgressEvent(value: unknown): value is FileUploadProgressEvent {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  if (!('uploadId' in value) || typeof value.uploadId !== 'string' || value.uploadId.length === 0) return false;
  if (!('phase' in value) || (value.phase !== 'receiving' && value.phase !== 'completed' && value.phase !== 'failed')) return false;
  if (!('loaded' in value) || typeof value.loaded !== 'number' || !Number.isFinite(value.loaded) || value.loaded < 0) return false;
  if (!('total' in value) || typeof value.total !== 'number' || !Number.isFinite(value.total) || value.total < 0) return false;
  if (!('percent' in value) || typeof value.percent !== 'number' || !Number.isFinite(value.percent)) return false;
  if ('fileName' in value && value.fileName !== undefined && typeof value.fileName !== 'string') return false;
  if ('route' in value && value.route !== undefined && typeof value.route !== 'string') return false;
  if ('method' in value && value.method !== undefined && typeof value.method !== 'string') return false;
  return true;
}
