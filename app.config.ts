export default defineAppConfig({
  toaster: {
    position: "top-right" as const,
    expand: true,
    duration: 8000,
  },
  ui: {
    button: {
      compoundVariants: [{ color: "primary", class: "hover:cursor-pointer" }],
    },
    input: {
      compoundVariants: [
        {
          class:
            "disabled:bg-gray-50 dark:disabled:bg-gray-800/50 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:border-gray-200 dark:disabled:border-gray-700 disabled:placeholder-gray-300 dark:disabled:placeholder-gray-600",
        },
      ],
    },
    drawer: {
      slots: {
        body: "flex-1 pb-4",
      },
    },
  },
});
