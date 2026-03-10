export default defineAppConfig({
  ui: {
    pagination: {
      slots: {
        root: 'w-full',
        item: 'w-9 h-9 rounded-xl',
        list: 'w-full flex-wrap'
      }
    },
    dropdownMenu: {
      slots: {
        item: 'group relative w-full flex items-center select-none outline-none before:absolute before:z-[-1] before:inset-px before:rounded-md data-disabled:cursor-not-allowed data-disabled:opacity-75',

      }
    },
    colors: {
      primary: "violet",
      secondary: "cyan",
      neutral: "slate",
      success: "emerald",
      warning: "amber",
      error: "rose",
      info: "cyan",
    },
    button: {
      slots: {
        base: [
          "inline-flex items-center justify-center gap-2",
          "whitespace-nowrap",
          "shrink-0",
          "rounded-xl",
          "text-sm font-medium",
          "transition-all duration-300",
          "outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "focus-visible:ring-[3px] focus-visible:ring-violet-500/30",
          "[&_svg]:pointer-events-none",
          "[&_svg:not([class*='size-'])]:size-4",
          "[&_svg]:shrink-0",
        ].join(" "),
      },
      compoundVariants: [
        {
          color: "primary",
          variant: "solid",
          class: "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/15 hover:shadow-lg hover:shadow-violet-500/20 hover:from-violet-500 hover:to-indigo-500 disabled:from-violet-400 disabled:to-indigo-400 dark:from-violet-500 dark:to-indigo-500 dark:hover:from-violet-400 dark:hover:to-indigo-400",
        },
        {
          color: "primary",
          variant: "soft",
          class: "bg-violet-500/15 text-violet-800 hover:bg-violet-500/25 dark:bg-violet-500/20 dark:text-violet-400 dark:hover:bg-violet-500/30 backdrop-blur-sm"
        },
        {
          color: "primary",
          variant: "ghost",
          class: "text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 dark:hover:bg-violet-500/15"
        },
        {
          color: "primary",
          variant: "outline",
          class: "bg-white/80 border border-violet-300 text-violet-700 hover:bg-violet-50 hover:border-violet-400 dark:bg-violet-500/10 dark:border-violet-500/30 dark:text-violet-400 dark:hover:bg-violet-500/20"
        },
        {
          color: "error",
          variant: "solid",
          class: "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/15 hover:shadow-lg hover:shadow-rose-500/20 hover:from-rose-400 hover:to-pink-400 disabled:from-rose-300 disabled:to-pink-300",
        },
        {
          color: "error",
          variant: "soft",
          class: "bg-rose-500/15 text-rose-800 hover:bg-rose-500/25 dark:bg-rose-500/20 dark:text-rose-400 dark:hover:bg-rose-500/30 backdrop-blur-sm"
        },
        {
          color: "error",
          variant: "ghost",
          class: "text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/15"
        },
        {
          color: "error",
          variant: "outline",
          class: "bg-white/80 border border-rose-300 text-rose-700 hover:bg-rose-50 hover:border-rose-400 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/20"
        },
        {
          color: "success",
          variant: "solid",
          class: "bg-gradient-to-r from-emerald-500 to-teal-500 text-emerald-950 shadow-md shadow-emerald-500/15 hover:shadow-lg hover:shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 dark:text-emerald-900",
        },
        {
          color: "success",
          variant: "soft",
          class: "bg-emerald-500/15 text-emerald-800 hover:bg-emerald-500/25 dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/30 backdrop-blur-sm"
        },
        {
          color: "success",
          variant: "ghost",
          class: "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15"
        },
        {
          color: "warning",
          variant: "solid",
          class: "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/15 hover:shadow-lg hover:shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400",
        },
        {
          color: "warning",
          variant: "soft",
          class: "bg-amber-500/15 text-amber-800 hover:bg-amber-500/25 dark:bg-amber-500/20 dark:text-amber-400 dark:hover:bg-amber-500/30 backdrop-blur-sm"
        },
        {
          color: "warning",
          variant: "ghost",
          class: "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 dark:hover:bg-amber-500/15"
        },
        {
          color: "neutral",
          variant: "solid",
          class: "bg-gray-800 text-white hover:bg-gray-900 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-100"
        },
        {
          color: "neutral",
          variant: "soft",
          class: "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        },
        {
          color: "neutral",
          variant: "ghost",
          class: "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
        },
        {
          color: "neutral",
          variant: "outline",
          class: "bg-white border-2 border-gray-400 text-gray-800 hover:bg-gray-100 hover:border-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:border-gray-500"
        }
      ],
    },
    badge: {
      slots: {
        base: "inline-flex items-center px-2.5 py-0.5 justify-center gap-1 rounded-full font-medium backdrop-blur-sm [&_svg]:text-current",
      },
      compoundVariants: [
        {
          color: "primary",
          variant: "soft",
          class: "bg-violet-100 text-violet-800 dark:bg-violet-500/25 dark:text-violet-300"
        },
        {
          color: "primary",
          variant: "solid",
          class: "bg-gradient-to-r from-violet-500 to-indigo-500 text-white"
        },
        {
          color: "success",
          variant: "soft",
          class: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-300"
        },
        {
          color: "error",
          variant: "soft",
          class: "bg-rose-100 text-rose-800 dark:bg-rose-500/25 dark:text-rose-300"
        },
        {
          color: "warning",
          variant: "soft",
          class: "bg-amber-100 text-amber-800 dark:bg-amber-500/25 dark:text-amber-300"
        },
        {
          color: "info",
          variant: "soft",
          class: "!text-gray-900"
        },
        {
          color: "info",
          variant: "solid",
          class: "!text-gray-900"
        },
      ]
    },
    input: {
      slots: {
        base: [
          "h-11 w-full rounded-xl",
          "glass-input",
          "px-4 py-2.5 text-sm",
          "text-gray-800 dark:text-white/90",
          "placeholder:text-gray-400 dark:placeholder:text-white/30",
          "focus:border-violet-500/40 dark:focus:border-violet-500/30",
          "focus:outline-none focus:ring-3 focus:ring-violet-500/10",
          "transition-all duration-300",
          "aria-[invalid=true]:border-rose-500/40 dark:aria-[invalid=true]:border-rose-500/30",
          "aria-[invalid=true]:ring-rose-500/10",
          "disabled:cursor-not-allowed disabled:opacity-60",
          "disabled:bg-gray-100 dark:disabled:bg-white/[0.03]",
          "disabled:border-gray-200 dark:disabled:border-white/[0.05]",
          "disabled:text-gray-400 dark:disabled:text-white/40",
        ].join(" "),
      },
    },
    textarea: {
      slots: {
        base: [
          "w-full rounded-xl",
          "glass-input",
          "px-4 py-2.5 text-sm min-h-[44px]",
          "text-gray-800 dark:text-white/90",
          "placeholder:text-gray-400 dark:placeholder:text-white/30",
          "focus:border-violet-500/40 dark:focus:border-violet-500/30",
          "focus:outline-none focus:ring-3 focus:ring-violet-500/10",
          "transition-all duration-300",
          "resize-none",
          "aria-[invalid=true]:border-rose-500/40 dark:aria-[invalid=true]:border-rose-500/30",
          "aria-[invalid=true]:ring-rose-500/10",
          "disabled:cursor-not-allowed disabled:opacity-60",
          "disabled:bg-gray-100 dark:disabled:bg-white/[0.03]",
          "disabled:border-gray-200 dark:disabled:border-white/[0.05]",
          "disabled:text-gray-400 dark:disabled:text-white/40",
        ].join(" "),
      },
    },
    select: {
      slots: {
        base: [
          "h-11 w-full rounded-xl",
          "glass-input",
          "px-4 py-2.5 pr-11 text-sm",
          "text-gray-800 dark:text-white/90",
          "appearance-none",
          "focus:border-violet-500/40 dark:focus:border-violet-500/30",
          "focus:outline-none focus:ring-3 focus:ring-violet-500/10",
          "transition-all duration-300",
          "disabled:cursor-not-allowed disabled:opacity-60",
          "disabled:bg-gray-100 dark:disabled:bg-white/[0.03]",
          "disabled:border-gray-200 dark:disabled:border-white/[0.05]",
          "disabled:text-gray-400 dark:disabled:text-white/40",
        ],
        item: [
          'cursor-pointer hover:bg-violet-500/10 dark:hover:bg-violet-500/15'
        ],
      },
    },
    formField: {
      slots: {
        root: "space-y-1.5",
        label: "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300",
        description: "text-theme-xs text-gray-500 dark:text-gray-400",
        error: "mt-1.5 text-theme-xs text-rose-500",
      },
    },
    card: {
      slots: {
        root: "rounded-2xl glass-card overflow-hidden relative group",
      },
    },
    drawer: {
      slots: {
        root: "glass-panel border-l border-[var(--glass-border)]",
        header: "border-b border-[var(--glass-border-subtle)] px-6 py-4",
        body: "flex-1 pb-4 px-6",
        footer: "border-t border-[var(--glass-border-subtle)] px-6 py-4",
      },
    },
    switch: {
      slots: {
        base: [
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-violet-500 data-[state=checked]:to-indigo-500",
          "data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600",
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
          "rounded-lg",
          "transition-all duration-300",
          "border-2 border-gray-300 dark:border-gray-600",
          "data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-violet-500 data-[state=checked]:to-indigo-500 data-[state=checked]:border-transparent",
          "focus-visible:ring-[3px] focus-visible:ring-violet-500/20",
        ].join(" "),
        icon: "text-white",
      },
    },
    notification: {
      slots: {
        root: "min-w-0 max-w-full glass-card",
        title: "min-w-0 break-words overflow-wrap-anywhere",
        description: "min-w-0 break-words overflow-wrap-anywhere",
        wrapper: "min-w-0",
      },
    },
    contextMenu: {
      slots: {
        item: [
          "group relative w-full flex items-center select-none outline-none",
          "before:absolute before:z-[-1] before:inset-px before:rounded-lg",
          "data-disabled:cursor-not-allowed data-disabled:opacity-75",
          "data-[state=open]:text-highlighted transition-colors before:transition-colors",
          "p-1.5 text-sm gap-1.5",
        ].join(" "),
      },
    },
  },
});
