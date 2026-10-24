export function useFormValidation(tableName: string) {
  const { validate } = useSchema(tableName);
  const formEditorRegistry = useFormEditorRegistry();
  const notify = useNotify();

  async function validateForm(
    record: Record<string, any>,
    errors: Ref<Record<string, string>>
  ): Promise<boolean> {
    const result = validate(record);

    const draftErrors = formEditorRegistry.value?.getDraftErrors?.() ?? {};
    if (!result.isValid || Object.keys(draftErrors).length > 0) {
      errors.value = { ...result.errors, ...draftErrors };
      notify.error("Invalid information", "Please correct the highlighted fields before saving.");
      return false;
    }

    const uniqueValid = await formEditorRegistry.value?.validateAllUniqueFields();
    if (uniqueValid === false) {
      notify.error("Duplicate value", "Please verify all unique fields before saving.");
      return false;
    }

    return true;
  }

  return { validateForm };
}
