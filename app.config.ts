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
        base: [
          // Base styling from Figma
          "rounded-xl",
          "h-10",
          "px-4 py-2",
          "text-base md:text-sm",
          "transition-all duration-300",
          "outline-none",
          // Background and border
          "bg-[var(--bg-input)] border border-[var(--border-input)]",
          // Placeholder
          "placeholder:text-[var(--text-tertiary)]",
          // Focus state
          "focus:border-[var(--color-primary-500)] focus:ring-[3px] focus:ring-[var(--color-primary-500)]/20",
          // Error state
          "aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-500/20",
        ].join(" "),
      },
      compoundVariants: [
        {
          class:
            "disabled:bg-gray-50 dark:disabled:bg-gray-800/50 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:border-gray-200 dark:disabled:border-gray-700 disabled:placeholder-gray-300 dark:disabled:placeholder-gray-600 disabled:cursor-not-allowed disabled:opacity-50",
        },
      ],
    },
    textarea: {
      slots: {
        base: [
          // Base styling from Figma
          "rounded-xl",
          "min-h-16",
          "px-4 py-2",
          "text-base md:text-sm",
          "transition-all duration-300",
          "outline-none",
          "resize-none",
          // Background and border
          "bg-[var(--bg-input)] border border-[var(--border-input)]",
          // Placeholder
          "placeholder:text-[var(--text-tertiary)]",
          // Focus state
          "focus:border-[var(--color-primary-500)] focus:ring-[3px] focus:ring-[var(--color-primary-500)]/20",
          // Error state
          "aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-500/20",
        ].join(" "),
      },
      compoundVariants: [
        {
          class: "disabled:cursor-not-allowed disabled:opacity-50",
        },
      ],
    },
    select: {
      slots: {
        base: [
          "rounded-xl",
          "h-10",
          "px-4 py-2",
          "text-base md:text-sm",
          "transition-all duration-300",
          "outline-none",
          "bg-[var(--bg-input)] border border-[var(--border-input)]",
          "focus:border-[var(--color-primary-500)] focus:ring-[3px] focus:ring-[var(--color-primary-500)]/20",
        ].join(" "),
      },
    },
    formField: {
      slots: {
        root: "space-y-2",
        label: "text-sm font-medium text-[var(--text-primary)]",
        description: "text-xs text-[var(--text-tertiary)]",
        error: "text-xs text-red-500",
      },
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
