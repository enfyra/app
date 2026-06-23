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
        item: 'group relative w-full flex items-center select-none outline-none before:absolute before:z-[-1] before:inset-px before:rounded-[var(--radius-subcontrol)] data-disabled:cursor-not-allowed data-disabled:opacity-75',

      }
    },
    colors: {
      primary: "violet",
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
          "rounded-[var(--radius-control)]",
          "text-sm font-medium",
          "transition-all duration-300",
          "outline-none",
          "disabled:cursor-not-allowed disabled:opacity-100",
          "focus-visible:ring-[3px] focus-visible:ring-[var(--theme-focus-ring)]",
          "[&_svg]:pointer-events-none",
          "[&_svg:not([class*='size-'])]:size-4",
          "[&_svg]:shrink-0",
        ].join(" "),
      },
      compoundVariants: [
        {
          color: "primary",
          variant: "solid",
          class: "bg-[var(--action-primary-bg)] text-[var(--action-primary-text)] shadow-theme-xs hover:bg-[var(--action-primary-bg-hover)] active:bg-[var(--action-primary-bg-active)] disabled:bg-[var(--action-primary-disabled-bg)] disabled:text-[var(--action-primary-disabled-text)]",
        },
        {
          color: "primary",
          variant: "soft",
          class: "bg-[var(--state-primary-soft-bg)] text-[var(--state-primary-soft-text)] hover:bg-[var(--state-primary-soft-bg-hover)] disabled:bg-[var(--state-primary-soft-bg)] disabled:text-[var(--control-disabled-text)]"
        },
        {
          color: "primary",
          variant: "ghost",
          class: "text-[var(--state-primary-soft-text)] hover:bg-[var(--state-primary-soft-bg)] disabled:bg-transparent disabled:text-[var(--control-disabled-text)]"
        },
        {
          color: "primary",
          variant: "outline",
          class: "bg-[var(--surface-default)] text-[var(--state-primary-soft-text)] ring-1 ring-inset ring-[var(--state-primary-outline-border)] hover:bg-[var(--state-primary-outline-bg-hover)] active:bg-[var(--state-primary-soft-bg-hover)] disabled:bg-[var(--surface-default)] disabled:text-[var(--control-disabled-text)]"
        },
        {
          color: "neutral",
          variant: "soft",
          class: "bg-[var(--action-neutral-bg)] text-[var(--action-neutral-text)] ring-1 ring-inset ring-[var(--action-neutral-border)] hover:bg-[var(--action-neutral-bg-hover)] hover:text-[var(--action-neutral-text-hover)] active:bg-[var(--action-neutral-bg-active)] disabled:bg-[var(--action-neutral-disabled-bg)] disabled:text-[var(--action-neutral-disabled-text)]"
        },
        {
          color: "neutral",
          variant: "ghost",
          class: "text-[var(--action-neutral-text)] hover:bg-[var(--action-neutral-bg)] hover:text-[var(--action-neutral-text-hover)] disabled:bg-transparent disabled:text-[var(--action-neutral-disabled-text)]"
        },
        {
          color: "neutral",
          variant: "outline",
          class: "bg-[var(--action-neutral-outline-bg)] text-[var(--action-neutral-text)] ring-1 ring-inset ring-[var(--action-neutral-outline-border)] shadow-theme-xs hover:bg-[var(--action-neutral-outline-bg-hover)] hover:text-[var(--action-neutral-text-hover)] active:bg-[var(--action-neutral-outline-bg-active)] disabled:bg-[var(--action-neutral-disabled-bg)] disabled:text-[var(--action-neutral-disabled-text)]"
        },
        {
          color: "error",
          variant: "solid",
          class: "!bg-[var(--action-danger-bg)] !text-[var(--action-danger-text)] shadow-theme-xs hover:!bg-[var(--action-danger-bg-hover)] active:!bg-[var(--action-danger-bg-active)] disabled:!bg-[var(--action-neutral-disabled-bg)] disabled:!text-[var(--action-neutral-disabled-text)]",
        },
        {
          color: "error",
          variant: "soft",
          class: "!bg-[var(--state-danger-soft-bg)] !text-[var(--state-danger-soft-text)] ring-1 ring-inset ring-[var(--state-danger-outline-border)] hover:!bg-[var(--state-danger-soft-bg-hover)] disabled:!bg-[var(--action-neutral-disabled-bg)] disabled:!text-[var(--action-neutral-disabled-text)]"
        },
        {
          color: "error",
          variant: "ghost",
          class: "!text-[var(--state-danger-soft-text)] hover:!bg-[var(--state-danger-soft-bg)] disabled:!bg-transparent disabled:!text-[var(--control-disabled-text)]"
        },
        {
          color: "error",
          variant: "outline",
          class: "!bg-[var(--state-danger-soft-bg)] !text-[var(--state-danger-soft-text)] ring-1 ring-inset ring-[var(--state-danger-outline-border)] hover:!bg-[var(--state-danger-soft-bg-hover)] active:!bg-[var(--state-danger-soft-bg-hover)] disabled:!bg-[var(--action-neutral-disabled-bg)] disabled:!text-[var(--action-neutral-disabled-text)]"
        },
        {
          color: "success",
          variant: "solid",
          class: "bg-[var(--action-success-bg)] text-[var(--action-success-text)] shadow-theme-xs hover:bg-[var(--action-success-bg-hover)] active:bg-[var(--action-success-bg-active)] disabled:bg-[var(--action-neutral-disabled-bg)] disabled:text-[var(--action-neutral-disabled-text)]",
        },
        {
          color: "success",
          variant: "soft",
          class: "bg-[var(--state-success-soft-bg)] text-[var(--state-success-soft-text)] hover:bg-[var(--state-success-soft-bg-hover)] disabled:bg-[var(--state-success-soft-bg)] disabled:text-[var(--control-disabled-text)]"
        },
        {
          color: "success",
          variant: "ghost",
          class: "text-[var(--state-success-soft-text)] hover:bg-[var(--state-success-soft-bg)] disabled:bg-transparent disabled:text-[var(--control-disabled-text)]"
        },
        {
          color: "warning",
          variant: "solid",
          class: "bg-[var(--action-warning-bg)] text-[var(--action-warning-text)] shadow-theme-xs hover:bg-[var(--action-warning-bg-hover)] active:bg-[var(--action-warning-bg-active)] disabled:bg-[var(--action-neutral-disabled-bg)] disabled:text-[var(--action-neutral-disabled-text)]",
        },
        {
          color: "warning",
          variant: "soft",
          class: "bg-[var(--state-warning-soft-bg)] text-[var(--state-warning-soft-text)] hover:bg-[var(--state-warning-soft-bg-hover)] disabled:bg-[var(--state-warning-soft-bg)] disabled:text-[var(--control-disabled-text)]"
        },
        {
          color: "warning",
          variant: "ghost",
          class: "text-[var(--state-warning-soft-text)] hover:bg-[var(--state-warning-soft-bg)] disabled:bg-transparent disabled:text-[var(--control-disabled-text)]"
        },
        {
          color: "info",
          variant: "solid",
          class: "bg-[var(--action-info-bg)] text-[var(--action-info-text)] shadow-theme-xs hover:bg-[var(--action-info-bg-hover)] active:bg-[var(--action-info-bg-active)] disabled:bg-[var(--action-neutral-disabled-bg)] disabled:text-[var(--action-neutral-disabled-text)]",
        },
        {
          color: "info",
          variant: "soft",
          class: "bg-[var(--state-info-soft-bg)] text-[var(--state-info-soft-text)] hover:bg-[var(--state-info-soft-bg-hover)] disabled:bg-[var(--state-info-soft-bg)] disabled:text-[var(--control-disabled-text)]"
        },
        {
          color: "info",
          variant: "ghost",
          class: "text-[var(--state-info-soft-text)] hover:bg-[var(--state-info-soft-bg)] disabled:bg-transparent disabled:text-[var(--control-disabled-text)]"
        }
      ],
    },
    badge: {
      slots: {
        base: "inline-flex items-center px-2.5 py-0.5 justify-center gap-1 rounded-full font-semibold",
      },
      compoundVariants: [
        {
          color: "primary",
          variant: "soft",
          class: "bg-[var(--badge-primary-soft-bg)] text-[var(--badge-primary-soft-text)] ring-1 ring-inset ring-[var(--badge-primary-soft-border)]"
        },
        {
          color: "primary",
          variant: "solid",
          class: "bg-[var(--action-primary-bg)] text-[var(--action-primary-text)] shadow-[var(--shadow-primary)]"
        },
        {
          color: "secondary",
          variant: "soft",
          class: "bg-[var(--badge-secondary-soft-bg)] text-[var(--badge-secondary-soft-text)] ring-1 ring-inset ring-[var(--badge-secondary-soft-border)]"
        },
        {
          color: "neutral",
          variant: "soft",
          class: "bg-[var(--badge-neutral-soft-bg)] text-[var(--badge-neutral-soft-text)] ring-1 ring-inset ring-[var(--badge-neutral-soft-border)]"
        },
        {
          color: "neutral",
          variant: "outline",
          class: "bg-transparent text-[var(--action-neutral-text)] ring-1 ring-inset ring-[var(--action-neutral-border)]"
        },
        {
          color: "success",
          variant: "soft",
          class: "bg-[var(--badge-success-soft-bg)] text-[var(--badge-success-soft-text)] ring-1 ring-inset ring-[var(--badge-success-soft-border)]"
        },
        {
          color: "error",
          variant: "soft",
          class: "bg-[var(--badge-danger-soft-bg)] text-[var(--badge-danger-soft-text)] ring-1 ring-inset ring-[var(--badge-danger-soft-border)]"
        },
        {
          color: "warning",
          variant: "soft",
          class: "bg-[var(--badge-warning-soft-bg)] text-[var(--badge-warning-soft-text)] ring-1 ring-inset ring-[var(--badge-warning-soft-border)]"
        },
        {
          color: "info",
          variant: "soft",
          class: "bg-[var(--badge-info-soft-bg)] text-[var(--badge-info-soft-text)] ring-1 ring-inset ring-[var(--badge-info-soft-border)]"
        },
      ]
    },
    input: {
      slots: {
        base: [
          "h-11 w-full rounded-[var(--radius-control)] border border-[var(--control-border)]",
          "bg-[var(--control-bg)]",
          "px-4 py-2.5 text-sm",
          "text-[var(--control-text)]",
          "shadow-theme-xs",
          "placeholder:text-[var(--control-placeholder)]",
          "focus:border-[var(--control-border-focus)]",
          "focus:outline-none focus:ring-3 focus:ring-[var(--theme-focus-ring)]",
          "transition-all duration-300",
          "aria-[invalid=true]:border-[var(--control-invalid-border)]",
          "aria-[invalid=true]:ring-[var(--control-invalid-ring)]",
          "disabled:cursor-not-allowed disabled:opacity-100",
          "disabled:border-[var(--control-disabled-border)] disabled:bg-[var(--control-disabled-bg)] disabled:text-[var(--control-disabled-text)]",
        ].join(" "),
      },
    },
    textarea: {
      slots: {
        base: [
          "w-full rounded-[var(--radius-control)] border border-[var(--control-border)]",
          "bg-[var(--control-bg)]",
          "px-4 py-2.5 text-sm min-h-[44px]",
          "text-[var(--control-text)]",
          "shadow-theme-xs",
          "placeholder:text-[var(--control-placeholder)]",
          "focus:border-[var(--control-border-focus)]",
          "focus:outline-none focus:ring-3 focus:ring-[var(--theme-focus-ring)]",
          "transition-all duration-300",
          "resize-none",
          "aria-[invalid=true]:border-[var(--control-invalid-border)]",
          "aria-[invalid=true]:ring-[var(--control-invalid-ring)]",
          "disabled:cursor-not-allowed disabled:opacity-100",
          "disabled:border-[var(--control-disabled-border)] disabled:bg-[var(--control-disabled-bg)] disabled:text-[var(--control-disabled-text)]",
        ].join(" "),
      },
    },
    select: {
      slots: {
        base: [
          "h-11 w-full rounded-[var(--radius-control)] border border-[var(--control-border)]",
          "bg-[var(--control-bg)]",
          "px-4 py-2.5 pr-11 text-sm",
          "text-[var(--control-text)]",
          "shadow-theme-xs",
          "appearance-none",
          "focus:border-[var(--control-border-focus)]",
          "focus:outline-none focus:ring-3 focus:ring-[var(--theme-focus-ring)]",
          "transition-all duration-300",
          "disabled:cursor-not-allowed disabled:opacity-100",
          "disabled:border-[var(--control-disabled-border)] disabled:bg-[var(--control-disabled-bg)] disabled:text-[var(--control-disabled-text)]",
        ],
        item: [
          'cursor-pointer hover:bg-[var(--state-primary-soft-bg)]'
        ],
      },
    },
    formField: {
      slots: {
        root: "space-y-1.5",
        label: "mb-1.5 block text-sm font-medium text-[var(--text-secondary)]",
        description: "text-theme-xs text-[var(--text-tertiary)]",
        error: "mt-1.5 text-theme-xs text-[var(--form-error-text)]",
      },
    },
    card: {
      slots: {
        root: "rounded-[var(--radius-card)] border border-[var(--card-border)] [background:var(--card-bg)] shadow-[var(--card-shadow)] transition-all duration-300 overflow-hidden relative group",
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
    modal: {
      slots: {
        overlay: 'bg-black/20 backdrop-blur-[2px]',
      },
    },
    switch: {
      slots: {
        base: [
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-focus-ring-strong)] focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "data-[state=checked]:bg-[var(--action-primary-bg)]",
          "data-[state=unchecked]:bg-[var(--control-border)]",
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
          "border-2 border-[var(--control-border)]",
          "data-[state=checked]:bg-[var(--action-primary-bg)] data-[state=checked]:border-[var(--action-primary-bg)]",
          "focus-visible:ring-[3px] focus-visible:ring-[var(--theme-focus-ring-strong)]",
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
            root: "bg-[var(--state-info-soft-bg)]",
            icon: "text-[var(--state-info-soft-text)]",
            title: "text-[var(--state-info-title-text)]",
            description: "text-[var(--state-info-description-text)]",
          }
        },
        {
          color: "info",
          variant: "outline",
          class: {
            root: "ring-[var(--state-info-outline-border)]",
            icon: "text-[var(--state-info-soft-text)]",
            title: "text-[var(--state-info-title-text)]",
            description: "text-[var(--state-info-description-text)]",
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
            link: "text-[var(--nav-item-text)] hover:!text-[var(--nav-item-hover-text)] hover:before:!bg-[var(--nav-item-hover-bg)] transition-colors before:!transition-colors",
            linkLeadingIcon: "text-current transition-colors",
          },
        },
        {
          variant: "pill",
          active: true,
          highlight: true,
          class: {
            link: "text-[var(--nav-item-active-text)] before:!bg-[var(--nav-item-active-bg)] before:!border before:!border-transparent before:!shadow-none hover:!text-[var(--nav-item-active-text)] hover:before:!bg-[var(--nav-item-active-bg-hover)]",
            linkLeadingIcon: "!text-current group-hover:!text-current",
            linkTrailingIcon: "!text-current group-hover:!text-current",
          },
        },
        {
          active: true,
          class: {
            childLink: "text-[var(--state-primary-soft-text)] before:!bg-[var(--state-primary-soft-bg)] before:!border-0 before:!shadow-none hover:!text-[var(--state-primary-soft-text)] hover:before:!bg-[var(--state-primary-soft-bg-hover)]",
          },
        },
      ],
    },
    contextMenu: {
      slots: {
        item: [
          "group relative w-full flex items-center select-none outline-none",
          "before:absolute before:z-[-1] before:inset-px before:rounded-[var(--radius-subcontrol)]",
          "data-disabled:cursor-not-allowed data-disabled:opacity-75",
          "data-[state=open]:text-highlighted transition-colors before:transition-colors",
          "p-1.5 text-sm gap-1.5",
        ].join(" "),
      },
    },
  },
});
