import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSchemaMutationPreviewResponse } from '~/utils/schema/schema-confirm';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '../../app');

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

  it('keeps the confirmation modal open when applying a schema update fails', () => {
    const collectionPage = readFileSync(join(appDir, 'pages/collections/[table].vue'), 'utf8');

    expect(collectionPage).toContain('if (updateError.value) {\n      return;\n    }');
  });
});
