const isVisible = ref(false);
const options = ref({
  title: "Confirm",
  content: "",
  confirmText: "Confirm",
  cancelText: "Cancel",
});

let resolver: (value: boolean) => void;


export function useConfirm() {
  const confirm = (opts: Partial<typeof options.value>): Promise<boolean> => {
    options.value = {
      ...options.value,
      ...opts,
    };
    isVisible.value = true;

    return new Promise((resolve) => {
      resolver = resolve;
    });
  };

  const onConfirm = () => {
    isVisible.value = false;
    resolver(true);
  };

  const onCancel = () => {
    isVisible.value = false;
    resolver(false);
  };

  return {
    confirm,
    isVisible,
    options,
    onConfirm,
    onCancel,
  };
}
