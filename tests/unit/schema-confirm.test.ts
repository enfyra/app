import { isSchemaMutationPreviewResponse } from '~/utils/schema/schema-confirm';

describe('schema confirmation responses', () => {
  it('recognizes a backend preview response', () => {
    expect(isSchemaMutationPreviewResponse({ data: [{ _preview: true }] })).toBe(true);
  });

  it('recognizes a destructive DELETE preview response', () => {
    expect(isSchemaMutationPreviewResponse({
      data: [{
        _preview: true,
        isDestructive: true,
        requiredConfirmHash: 'delete-confirm-hash',
      }],
    })).toBe(true);
  });

  it('does not treat an applied mutation as a preview', () => {
    expect(isSchemaMutationPreviewResponse({ data: [{ mutationId: 'mutation-1' }] })).toBe(false);
    expect(isSchemaMutationPreviewResponse(null)).toBe(false);
  });
});
