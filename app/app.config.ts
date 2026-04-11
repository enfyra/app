export default defineAppConfig({
  ui: {
    empty: {
      slots: {
        title: "text-pretty font-medium text-[var(--text-primary)]",
        description: "text-balance text-center text-[var(--text-secondary)]",
        avatar: "text-[var(--text-tertiary)]",
      },
      variants: {
        variant: {
          outline: {
            root: "bg-[var(--surface-default)] ring-1 ring-[var(--surface-panel-ring)]",
            description: "text-balance text-center text-[var(--text-secondary)]",
          },
          naked: {
            description: "text-balance text-center text-[var(--text-secondary)]",
          },
          soft: {
            description: "text-balance text-center text-[var(--text-secondary)]",
          },
          subtle: {
            description: "text-balance text-center text-[var(--text-secondary)]",
          },
          solid: {
            title: "text-pretty font-medium text-inverted",
            description: "text-balance text-center text-dimmed",
          },
        },
      },
    },
    pagination: {
      slots: {
        root: 'w-full', 
        item: '!w-fit min-w-9',
        list: 'w-full flex-wrap'
      }
    },
    dropdownMenu: {
      slots: {
        item: 'group relative w-full flex items-center select-none outline-none before:absolute before:z-[-1] before:inset-px before:rounded-md data-disabled:cursor-not-allowed data-disabled:opacity-75',

      }
    },
    colors: {
      primary: "purple",
      secondary: "cyan",
      neutral: "slate",
      success: "success",
      warning: "warning",
      error: "error",
      info: "info",
    },
    button: {
      slots: {
        base: [
          "inline-flex items-center justify-center gap-2",
          "whitespace-nowrap",
          "shrink-0",
          "rounded-lg",
          "text-sm font-medium",
          "transition-all duration-300",
          "outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "focus-visible:ring-[3px] focus-visible:ring-brand-500/10",
          "[&_svg]:pointer-events-none",
          "[&_svg:not([class*='size-'])]:size-4",
          "[&_svg]:shrink-0",
        ].join(" "),
      },
      compoundVariants: [
        {
          color: "primary",
          variant: "solid",
          class: "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300",
        },
        {
          color: "primary",
          variant: "soft",
          class: "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-500/20"
        },
        {
          color: "primary",
          variant: "ghost",
          class: "text-brand-500 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10"
        },
        {
          color: "primary",
          variant: "outline",
          class: "bg-[var(--surface-default)] text-brand-600 dark:text-primary ring-1 ring-inset ring-brand-400/40 dark:ring-primary/30 hover:bg-brand-50 dark:hover:bg-primary/10"
        },
        {
          color: "error",
          variant: "solid",
          class: "bg-error-500 text-white shadow-theme-xs hover:bg-error-600 disabled:bg-error-300 disabled:hover:bg-error-300 dark:bg-error-500 dark:hover:bg-error-600 dark:disabled:hover:bg-error-300",
        },
        {
          color: "error",
          variant: "soft",
          class: "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500 hover:bg-error-100 dark:hover:bg-error-500/20 disabled:hover:bg-error-50 dark:disabled:hover:bg-error-500/15"
        },
        {
          color: "error",
          variant: "ghost",
          class: "text-error-600 dark:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
        },
        {
          color: "error",
          variant: "outline",
          class: "bg-[var(--surface-default)] text-error-600 ring-1 ring-inset ring-error-300 hover:bg-error-50 dark:text-error-500 dark:ring-error-700 dark:hover:bg-error-500/10 disabled:hover:bg-[var(--surface-default)]"
        },
        {
          color: "success",
          variant: "solid",
          class: "bg-success-500 text-white shadow-theme-xs hover:bg-success-600 disabled:bg-success-300 dark:bg-success-500 dark:hover:bg-success-600",
        },
        {
          color: "success",
          variant: "soft",
          class: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500 hover:bg-success-100 dark:hover:bg-success-500/20"
        },
        {
          color: "success",
          variant: "ghost",
          class: "text-success-600 dark:text-success-500 hover:bg-success-50 dark:hover:bg-success-500/10"
        },
        {
          color: "warning",
          variant: "solid",
          class: "bg-warning-500 text-white shadow-theme-xs hover:bg-warning-600 disabled:bg-warning-300 dark:bg-warning-500 dark:hover:bg-warning-600",
        },
        {
          color: "warning",
          variant: "soft",
          class: "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400 hover:bg-warning-100 dark:hover:bg-warning-500/20"
        },
        {
          color: "warning",
          variant: "ghost",
          class: "text-warning-600 dark:text-warning-400 hover:bg-warning-50 dark:hover:bg-warning-500/10"
        },
        {
          color: "info",
          variant: "solid",
          class: "bg-info-600 text-white shadow-theme-xs hover:bg-info-700 disabled:bg-info-300 dark:bg-info-500 dark:hover:bg-info-600",
        },
        {
          color: "info",
          variant: "soft",
          class: "bg-info-50 text-info-700 dark:bg-info-500/15 dark:text-info-400 hover:bg-info-100 dark:hover:bg-info-500/20"
        },
        {
          color: "info",
          variant: "ghost",
          class: "text-info-700 dark:text-info-400 hover:bg-info-50 dark:hover:bg-info-500/10"
        }
      ],
    },
    badge: {
      slots: {
        base: "inline-flex items-center px-2.5 py-0.5 justify-center gap-1 rounded-full font-medium",
      },
      compoundVariants: [
        {
          color: "primary",
          variant: "soft",
          class: "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400"
        },
        {
          color: "primary",
          variant: "solid",
          class: "bg-brand-500 text-white dark:text-white"
        },
        {
          color: "success",
          variant: "soft",
          class: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500"
        },
        {
          color: "error",
          variant: "soft",
          class: "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500"
        },
        {
          color: "warning",
          variant: "soft",
          class: "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400"
        },
        {
          color: "info",
          variant: "soft",
          class: "bg-info-50 text-info-700 dark:bg-info-500/15 dark:text-info-400"
        },
      ]
    },
    input: {
      slots: {
        base: [
          "h-11 w-full rounded-lg border border-[var(--border-strong)]",
          "bg-transparent dark:bg-[var(--surface-muted)]",
          "px-4 py-2.5 text-sm",
          "text-[var(--text-primary)]",
          "shadow-theme-xs",
          "placeholder:text-[var(--text-quaternary)]",
          "focus:border-brand-300 dark:focus:border-brand-800",
          "focus:outline-none focus:ring-3 focus:ring-brand-500/10",
          "transition-all duration-300",
          "aria-[invalid=true]:border-error-300 dark:aria-[invalid=true]:border-error-700",
          "aria-[invalid=true]:ring-error-500/10",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "disabled:border-[var(--border-subtle)] disabled:bg-[var(--surface-muted)]",
        ].join(" "),
      },
    },
    textarea: {
      slots: {
        base: [
          "w-full rounded-lg border border-[var(--border-strong)]",
          "bg-transparent dark:bg-[var(--surface-muted)]",
          "px-4 py-2.5 text-sm min-h-[44px]",
          "text-[var(--text-primary)]",
          "shadow-theme-xs",
          "placeholder:text-[var(--text-quaternary)]",
          "focus:border-brand-300 dark:focus:border-brand-800",
          "focus:outline-none focus:ring-3 focus:ring-brand-500/10",
          "transition-all duration-300",
          "resize-none",
          "aria-[invalid=true]:border-error-300 dark:aria-[invalid=true]:border-error-700",
          "aria-[invalid=true]:ring-error-500/10",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "disabled:border-[var(--border-subtle)] disabled:bg-[var(--surface-muted)]",
        ].join(" "),
      },
    },
    select: {
      slots: {
        base: [
          "h-11 w-full rounded-lg border border-[var(--border-strong)]",
          "bg-transparent dark:bg-[var(--surface-muted)]",
          "px-4 py-2.5 pr-11 text-sm",
          "text-[var(--text-primary)]",
          "shadow-theme-xs",
          "appearance-none",
          "focus:border-brand-300 dark:focus:border-brand-800",
          "focus:outline-none focus:ring-3 focus:ring-brand-500/10",
          "transition-all duration-300",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "disabled:border-[var(--border-subtle)] disabled:bg-[var(--surface-muted)]",
        ],
        item: [
          'cursor-pointer hover:bg-primary-500/20'
        ],
      },
    },
    formField: {
      slots: {
        root: "space-y-1.5",
        label: "mb-1.5 block text-sm font-medium text-[var(--text-secondary)]",
        description: "text-theme-xs text-[var(--text-tertiary)]",
        error: "mt-1.5 text-theme-xs text-error-500",
      },
    },
    card: {
      slots: {
        root: "rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] transition-all duration-300 overflow-hidden relative group",
      },
    },
    drawer: {
      slots: {
        root: "bg-[var(--surface-default)] border-l border-[var(--border-default)]",
        header: "border-b border-[var(--border-default)] py-4",
        body: "flex-1 pb-4",
        footer: "border-t border-[var(--border-default)] py-4",
      },
    },
    switch: {
      slots: {
        base: [
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "data-[state=checked]:bg-brand-500 dark:data-[state=checked]:bg-brand-500",
          "data-[state=unchecked]:bg-[var(--border-strong)]",
        ].join(" "),
        thumb: [
          "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out",
          "data-[state=checked]:translate-x-5",
          "data-[state=unchecked]:translate-x-0",
        ].join(" "),
      },
    },
    checkbox: {
      slots: {
        base: [
          "rounded",
          "transition-all duration-300",
          "border-2 border-[var(--border-strong)]",
          "data-[state=checked]:bg-primary data-[state=checked]:border-primary",
          "focus-visible:ring-[3px] focus-visible:ring-purple-500/20",
        ].join(" "),
        icon: "text-white",
      },
    },

    alert: {
      compoundVariants: [
        {
          color: "info",
          variant: "soft",
          class: {
            root: "bg-info-50 dark:bg-info-500/10",
            icon: "text-info-600 dark:text-info-400",
            title: "text-info-800 dark:text-info-200",
            description: "text-info-700 dark:text-info-300",
          }
        },
        {
          color: "info",
          variant: "outline",
          class: {
            root: "ring-info-300 dark:ring-info-700",
            icon: "text-info-600 dark:text-info-400",
            title: "text-info-800 dark:text-info-200",
            description: "text-info-700 dark:text-info-300",
          }
        },
      ]
    },
    notification: {
      slots: {
        root: "min-w-0 max-w-full",
        title: "min-w-0 break-words overflow-wrap-anywhere",
        description: "min-w-0 break-words overflow-wrap-anywhere",
        wrapper: "min-w-0",
      },
    },
    navigationMenu: {
      compoundVariants: [
        {
          disabled: false,
          active: false,
          variant: "pill",
          class: {
            link: "hover:!text-[var(--text-tertiary)] hover:before:!bg-transparent transition-colors before:!transition-none",
            linkLeadingIcon: "group-hover:!text-[var(--text-tertiary)] transition-colors",
          },
        },
        {
          variant: "pill",
          active: true,
          highlight: true,
          class: {
            link: "before:bg-[var(--surface-default)] before:shadow-xs before:border before:border-[var(--border-default)] before:!transition-none text-[var(--text-secondary)] hover:!text-[var(--text-secondary)] hover:before:!bg-[var(--surface-default)] hover:before:!border-[var(--border-default)]",
            linkLeadingIcon: "!text-[var(--text-secondary)] group-hover:!text-[var(--text-secondary)]",
          },
        },
        {
          active: true,
          class: {
            childLink: "before:bg-[var(--surface-default)] before:shadow-xs before:border before:border-[var(--border-default)] before:!transition-none text-[var(--text-secondary)] hover:!text-[var(--text-secondary)] hover:before:!bg-[var(--surface-default)]",
          },
        },
      ],
    },
    contextMenu: {
      slots: {
        item: [
          "group relative w-full flex items-center select-none outline-none",
          "before:absolute before:z-[-1] before:inset-px before:rounded-md",
          "data-disabled:cursor-not-allowed data-disabled:opacity-75",
          "data-[state=open]:text-highlighted transition-colors before:transition-colors",
          "p-1.5 text-sm gap-1.5",
        ].join(" "),
      },
    },
  },
});
