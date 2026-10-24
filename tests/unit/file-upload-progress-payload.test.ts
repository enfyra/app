import { describe, expect, it } from 'vitest';
import { isFileUploadProgressEvent } from '~/utils/file-management/upload-progress';

const progress = {
  uploadId: 'upload-1',
  phase: 'receiving',
  loaded: 12,
  total: 24,
  percent: 50,
};

describe('upload progress payload boundary', () => {
  it.each(['receiving', 'completed', 'failed'])('accepts the supported %s phase', phase => {
    expect(isFileUploadProgressEvent({ ...progress, phase })).toBe(true);
  });

  it('keeps optional metadata and future fields compatible', () => {
    expect(isFileUploadProgressEvent({ ...progress, fileName: 'file.txt', route: '/upload', method: 'POST', extra: null })).toBe(true);
    expect(isFileUploadProgressEvent({ ...progress, total: 0 })).toBe(true);
    expect(isFileUploadProgressEvent({ ...progress, percent: 150 })).toBe(true);
  });

  it.each([
    null, [], {},
    { ...progress, uploadId: '' },
    { ...progress, uploadId: 1 },
    { ...progress, phase: 'done' },
    { ...progress, percent: '50' },
    { ...progress, percent: Number.NaN },
    { ...progress, percent: Number.POSITIVE_INFINITY },
    { ...progress, loaded: -1 },
    { ...progress, total: Number.NaN },
    { ...progress, fileName: {} },
    { ...progress, route: 1 },
    { ...progress, method: null },
  ])('rejects malformed telemetry without coercion: %j', payload => {
    expect(isFileUploadProgressEvent(payload)).toBe(false);
  });
});
