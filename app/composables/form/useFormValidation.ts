export function useFormValidation(tableName: string) {
  const { validate } = useSchema(tableName);
  const formEditorRegistry = useFormEditorRegistry();
  const toast = useToast();

  async function validateForm(
    record: Record<string, any>,
    errors: Ref<Record<string, string>>
  ): Promise<boolean> {
    const result = validate(record);

    if (!result.isValid) {
      errors.value = result.errors;
      toast.add({
        title: "Missing information",
        color: "error",
        description: "Please fill in all required fields.",
      });
      return false;
    }

    const uniqueValid = await formEditorRegistry.value?.validateAllUniqueFields();
    if (uniqueValid === false) {
      toast.add({
        title: "Duplicate value",
        color: "error",
        description: "Please verify all unique fields before saving.",
      });
      return false;
    }

    return true;
  }

  return { validateForm };
}
