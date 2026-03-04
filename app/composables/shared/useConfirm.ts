const isVisible = ref(false);

const defaultOptions = {
  title: "Confirm",
  content: "",
  confirmText: "Confirm",
  cancelText: "Cancel",
};

const options = ref({ ...defaultOptions });

let resolver: (value: boolean) => void;

export function useConfirm() {
  const confirm = (opts: Partial<typeof defaultOptions>): Promise<boolean> => {
    options.value = {
      ...defaultOptions,
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
