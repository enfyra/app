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

      },
      compoundVariants: [
        {
          color: "error",
          active: false,
          class: {
            item: "!text-[var(--state-danger-soft-text)] before:bg-[var(--state-danger-soft-bg)] data-highlighted:!text-[var(--state-danger-soft-text)] data-highlighted:before:!bg-[var(--state-danger-soft-bg-hover)] data-[state=open]:!text-[var(--state-danger-soft-text)] data-[state=open]:before:!bg-[var(--state-danger-soft-bg-hover)]",
            itemLeadingIcon: "!text-[var(--state-danger-soft-text)] group-data-highlighted:!text-[var(--state-danger-soft-text)] group-data-[state=open]:!text-[var(--state-danger-soft-text)]",
          },
        },
      ],
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
          "disabled:cursor-not-allowed disabled:!opacity-100 aria-disabled:cursor-not-allowed aria-disabled:!opacity-100",
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
          class: "eapp-button-primary-solid",
        },
        {
          color: "primary",
          variant: "soft",
          class: "eapp-button-primary-soft"
        },
        {
          color: "primary",
          variant: "ghost",
          class: "eapp-button-primary-ghost"
        },
        {
          color: "primary",
          variant: "outline",
          class: "eapp-button-primary-outline"
        },
        {
          color: "neutral",
          variant: "soft",
          class: "eapp-button-neutral-soft"
        },
        {
          color: "neutral",
          variant: "ghost",
          class: "eapp-button-neutral-ghost"
        },
        {
          color: "neutral",
          variant: "outline",
          class: "eapp-button-neutral-outline"
        },
        {
          color: "error",
          variant: "solid",
          class: "eapp-button-danger-solid",
        },
        {
          color: "error",
          variant: "soft",
          class: "eapp-button-danger-soft"
        },
        {
          color: "error",
          variant: "ghost",
          class: "eapp-button-danger-ghost"
        },
        {
          color: "error",
          variant: "outline",
          class: "eapp-button-danger-soft"
        },
        {
          color: "success",
          variant: "solid",
          class: "eapp-button-success-solid",
        },
        {
          color: "success",
          variant: "soft",
          class: "eapp-button-success-soft"
        },
        {
          color: "success",
          variant: "ghost",
          class: "eapp-button-success-ghost"
        },
        {
          color: "warning",
          variant: "solid",
          class: "eapp-button-warning-solid",
        },
        {
          color: "warning",
          variant: "soft",
          class: "eapp-button-warning-soft"
        },
        {
          color: "warning",
          variant: "ghost",
          class: "eapp-button-warning-ghost"
        },
        {
          color: "info",
          variant: "solid",
          class: "eapp-button-info-solid",
        },
        {
          color: "info",
          variant: "soft",
          class: "eapp-button-info-soft"
        },
        {
          color: "info",
          variant: "ghost",
          class: "eapp-button-info-ghost"
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
      compoundVariants: [
        {
          color: "primary",
          variant: ["outline", "subtle"],
          class: "focus:ring-2 focus:ring-inset focus:ring-[var(--theme-focus-ring-strong)]",
        },
        {
          color: "primary",
          highlight: true,
          class: "ring ring-inset ring-[var(--state-primary-outline-border)]",
        },
      ],
    },
    selectMenu: {
      slots: {
        item: [
          "data-highlighted:not-data-disabled:!text-[var(--text-primary)]",
          "data-highlighted:not-data-disabled:before:!bg-[var(--state-primary-soft-bg)]",
        ].join(" "),
      },
      compoundVariants: [
        {
          color: "primary",
          variant: ["outline", "subtle"],
          class: "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--theme-focus-ring-strong)]",
        },
        {
          color: "primary",
          highlight: true,
          class: "ring ring-inset ring-[var(--state-primary-outline-border)]",
        },
      ],
    },
    inputMenu: {
      slots: {
        item: [
          "data-highlighted:not-data-disabled:!text-[var(--text-primary)]",
          "data-highlighted:not-data-disabled:before:!bg-[var(--state-primary-soft-bg)]",
        ].join(" "),
      },
      compoundVariants: [
        {
          color: "primary",
          variant: ["outline", "subtle"],
          class: "focus:ring-2 focus:ring-inset focus:ring-[var(--theme-focus-ring-strong)]",
        },
        {
          color: "primary",
          highlight: true,
          class: "ring ring-inset ring-[var(--state-primary-outline-border)]",
        },
      ],
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
          "rounded-[var(--radius-subcontrol)]",
          "transition-all duration-200",
          "border border-[var(--control-border)] bg-[var(--control-bg)] shadow-theme-xs",
          "data-[state=checked]:border-[var(--action-primary-bg)] data-[state=checked]:bg-[var(--action-primary-bg)]",
          "data-[state=unchecked]:hover:border-[var(--control-border-focus)] data-[state=unchecked]:hover:bg-[var(--surface-muted)]",
          "focus-visible:ring-[3px] focus-visible:ring-[var(--theme-focus-ring-strong)]",
        ].join(" "),
        indicator: "text-[var(--action-primary-text)]",
        icon: "text-[var(--action-primary-text)]",
        label: "text-[var(--text-secondary)]",
      },
    },

    alert: {
      slots: {
        root: "rounded-[var(--radius-panel)] border p-4",
        title: "font-semibold",
        description: "opacity-100",
      },
      compoundVariants: [
        {
          color: "primary",
          variant: "soft",
          class: {
            root: "!border-[var(--state-primary-outline-border)] !bg-[var(--state-primary-soft-bg)] !ring-1 !ring-inset !ring-[var(--state-primary-outline-border)]",
            icon: "text-[var(--state-primary-soft-text)]",
            title: "text-[var(--text-primary)]",
            description: "text-[var(--text-secondary)]",
          }
        },
        {
          color: "primary",
          variant: "outline",
          class: {
            root: "!border-[var(--state-primary-outline-border)] !bg-[var(--state-primary-soft-bg)] !ring-1 !ring-inset !ring-[var(--state-primary-outline-border)]",
            icon: "text-[var(--state-primary-soft-text)]",
            title: "text-[var(--text-primary)]",
            description: "text-[var(--text-secondary)]",
          }
        },
        {
          color: "success",
          variant: "soft",
          class: {
            root: "!border-[var(--state-success-outline-border)] !bg-[var(--state-success-soft-bg)] !ring-1 !ring-inset !ring-[var(--state-success-outline-border)]",
            icon: "text-[var(--state-success-soft-text)]",
            title: "text-[var(--state-success-title-text)]",
            description: "text-[var(--state-success-description-text)]",
          }
        },
        {
          color: "success",
          variant: "outline",
          class: {
            root: "!border-[var(--state-success-outline-border)] !bg-[var(--state-success-soft-bg)] !ring-1 !ring-inset !ring-[var(--state-success-outline-border)]",
            icon: "text-[var(--state-success-soft-text)]",
            title: "text-[var(--state-success-title-text)]",
            description: "text-[var(--state-success-description-text)]",
          }
        },
        {
          color: "warning",
          variant: "soft",
          class: {
            root: "!border-[var(--state-warning-outline-border)] !bg-[var(--state-warning-soft-bg)] !ring-1 !ring-inset !ring-[var(--state-warning-outline-border)]",
            icon: "text-[var(--state-warning-soft-text)]",
            title: "text-[var(--state-warning-title-text)]",
            description: "text-[var(--state-warning-description-text)]",
          }
        },
        {
          color: "warning",
          variant: "outline",
          class: {
            root: "!border-[var(--state-warning-outline-border)] !bg-[var(--state-warning-soft-bg)] !ring-1 !ring-inset !ring-[var(--state-warning-outline-border)]",
            icon: "text-[var(--state-warning-soft-text)]",
            title: "text-[var(--state-warning-title-text)]",
            description: "text-[var(--state-warning-description-text)]",
          }
        },
        {
          color: "error",
          variant: "soft",
          class: {
            root: "!border-[var(--state-danger-outline-border)] !bg-[var(--state-danger-soft-bg)] !ring-1 !ring-inset !ring-[var(--state-danger-outline-border)]",
            icon: "text-[var(--state-danger-soft-text)]",
            title: "text-[var(--state-danger-title-text)]",
            description: "text-[var(--state-danger-description-text)]",
          }
        },
        {
          color: "error",
          variant: "outline",
          class: {
            root: "!border-[var(--state-danger-outline-border)] !bg-[var(--state-danger-soft-bg)] !ring-1 !ring-inset !ring-[var(--state-danger-outline-border)]",
            icon: "text-[var(--state-danger-soft-text)]",
            title: "text-[var(--state-danger-title-text)]",
            description: "text-[var(--state-danger-description-text)]",
          }
        },
        {
          color: "info",
          variant: "soft",
          class: {
            root: "!border-[var(--state-info-outline-border)] !bg-[var(--state-info-soft-bg)] !ring-1 !ring-inset !ring-[var(--state-info-outline-border)]",
            icon: "text-[var(--state-info-soft-text)]",
            title: "text-[var(--state-info-title-text)]",
            description: "text-[var(--state-info-description-text)]",
          }
        },
        {
          color: "info",
          variant: "outline",
          class: {
            root: "!border-[var(--state-info-outline-border)] !bg-[var(--state-info-soft-bg)] !ring-1 !ring-inset !ring-[var(--state-info-outline-border)]",
            icon: "text-[var(--state-info-soft-text)]",
            title: "text-[var(--state-info-title-text)]",
            description: "text-[var(--state-info-description-text)]",
          }
        },
      ]
    },
    progress: {
      slots: {
        base: "bg-[var(--surface-muted)]",
      },
      compoundVariants: [
        {
          color: "primary",
          class: {
            indicator: "bg-[var(--action-primary-bg)]",
            steps: "text-[var(--state-primary-soft-text)]",
          },
        },
      ],
    },
    radioGroup: {
      slots: {
        legend: "text-[var(--text-secondary)]",
        label: "text-[var(--text-primary)]",
        description: "text-[var(--text-tertiary)]",
        base: "ring-[var(--control-border)] focus-visible:outline-[var(--theme-focus-ring-strong)]",
      },
      compoundVariants: [
        {
          color: "primary",
          class: {
            base: "focus-visible:outline-[var(--theme-focus-ring-strong)]",
            indicator: "bg-[var(--action-primary-bg)]",
          },
        },
        {
          color: "primary",
          variant: ["card", "table"],
          class: {
            item: "has-data-[state=checked]:border-[var(--state-primary-outline-border)] has-data-[state=checked]:bg-[var(--state-primary-soft-bg)]",
          },
        },
      ],
    },
    tabs: {
      slots: {
        list: "bg-[var(--surface-muted)]",
      },
      compoundVariants: [
        {
          color: "primary",
          variant: "pill",
          class: {
            indicator: "bg-[var(--action-primary-bg)]",
            trigger: "data-[state=active]:text-[var(--action-primary-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-focus-ring-strong)]",
          },
        },
        {
          color: "primary",
          variant: "link",
          class: {
            indicator: "bg-[var(--action-primary-bg)]",
            trigger: "data-[state=active]:text-[var(--state-primary-soft-text)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--theme-focus-ring-strong)]",
          },
        },
      ],
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
