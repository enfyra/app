export function useFormValidation(tableName: string) {
  const { validate } = useSchema(tableName);
  const formEditorRegistry = useFormEditorRegistry();
  const notify = useNotify();

  async function validateForm(
    record: Record<string, any>,
    errors: Ref<Record<string, string>>
  ): Promise<boolean> {
    const result = validate(record);

    if (!result.isValid) {
      errors.value = result.errors;
      notify.error("Missing information", "Please fill in all required fields.");
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
