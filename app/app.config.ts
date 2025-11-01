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
      slots: {
        base: [
          "inline-flex items-center justify-center gap-2",
          "whitespace-nowrap",
          "shrink-0",
          "rounded-full",
          "text-sm font-medium",
          "transition-all duration-300",
          "outline-none",
          "disabled:pointer-events-none disabled:opacity-50",
          "focus-visible:ring-[3px] focus-visible:ring-purple-500/20",
          "[&_svg]:pointer-events-none",
          "[&_svg:not([class*='size-'])]:size-4",
          "[&_svg]:shrink-0",
        ].join(" "),
      },
      compoundVariants: [
        {
          color: "primary",
          variant: "solid",
          class: "text-white",
        },
        {
          color: "primary",
          variant: "soft",
          class: "text-primary-400"
        }
      ],
    },
    badge: {
      compoundVariants: [
        {
          color: "primary",
          variant: "soft",
          class: "text-primary-400"
        }
      ]
    },
    input: {
      slots: {
        base: [
          // Base styling matching Figma design
          "flex h-10 w-full min-w-0",
          "rounded-xl",
          "px-4 py-2",
          "text-base md:text-sm",
          "border border-[var(--border-input)]",
          "bg-[var(--bg-input)] backdrop-blur-sm",
          "transition-all duration-300",
          "outline-none",
          "text-[var(--text-primary)]",
          "placeholder:text-[var(--text-tertiary)]",
          "selection:bg-purple-500 selection:text-white",
          "focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20",
          "aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-500/20",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--text-primary)]",
        ].join(" "),
      },
    },
    textarea: {
      slots: {
        base: [
          // Base styling matching Figma design
          "flex w-full",
          "min-h-16",
          "rounded-xl",
          "px-4 py-3",
          "text-base md:text-sm",
          "border border-[var(--border-input)]",
          "bg-[var(--bg-input)] backdrop-blur-sm",
          "resize-none",
          "transition-all duration-300",
          "outline-none",
          // Text and placeholder
          "text-[var(--text-primary)]",
          "placeholder:text-[var(--text-tertiary)]",
          "selection:bg-purple-500 selection:text-white",
          // Focus state
          "focus:border-purple-500 focus:ring-[3px] focus:ring-purple-500/20",
          // Error/invalid state
          "aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-500/20",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50",
        ].join(" "),
      },
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
          "focus:border-primary focus:ring-[3px] focus:ring-primary/20",
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
