import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { ref } from 'vue';
import { expect, it, vi } from 'vitest';
const validateUnique = vi.fn(async () => true);
mockNuxtImport('useSchema', () => () => ({ validate: () => ({ isValid: true, errors: {} }) }));
const draftErrors = ref<Record<string, string>>({});
mockNuxtImport('useFormEditorRegistry', () => () => ref({ validateAllUniqueFields: validateUnique, getDraftErrors: () => draftErrors.value }));
mockNuxtImport('useNotify', () => () => ({ error: vi.fn() }));
import { useFormValidation } from '~/composables/form/useFormValidation';

it('does not validate a last-good model as saveable while its JSON draft is invalid', async () => {
  draftErrors.value = { payload: 'Invalid JSON' };
  validateUnique.mockClear();
  const errors = ref({ payload: 'Invalid JSON' });
  expect(await useFormValidation('orders').validateForm({ title: 'changed', payload: { old: true } }, errors)).toBe(false);
  expect(errors.value.payload).toBe('Invalid JSON');
  expect(validateUnique).not.toHaveBeenCalled();
});
it('allows a corrected schema error to be revalidated', async () => {
  draftErrors.value = {};
  const errors = ref({ title: 'Required' });
  expect(await useFormValidation('orders').validateForm({ title: 'valid' }, errors)).toBe(true);
});
