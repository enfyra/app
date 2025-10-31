export default defineAppConfig({
  toaster: {
    position: "top-right" as const,
    expand: true,
    duration: 8000,
  },
  ui: {
    colors: {
      primary: "purple",
      neutral: "slate",
    },
    button: {
      compoundVariants: [
        {
          color: "primary" as const,
          variant: "solid" as const,
          class: "electric-gradient-button",
        },
      ],
    },
    input: {
      slots: {
        base: "rounded-xl transition-all duration-300",
      },
      compoundVariants: [
        {
          class:
            "disabled:bg-gray-50 dark:disabled:bg-gray-800/50 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:border-gray-200 dark:disabled:border-gray-700 disabled:placeholder-gray-300 dark:disabled:placeholder-gray-600",
        },
      ],
    },
    card: {
      slots: {
        base: "rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] transition-all duration-300 card-float hover:border-[var(--border-strong)] overflow-hidden relative group",
      },
    },
    drawer: {
      slots: {
        body: "flex-1 pb-4",
      },
    },
  },
});
