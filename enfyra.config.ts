import type { EnfyraConfig } from "./enfyra.config.types";

export const enfyraConfig: EnfyraConfig = {
  richText: {
    plugins: ['link', 'lists', 'code', 'table'],
    toolbar: 'undo redo | bold italic underline | codeinline | bullist numlist | link table | code ',
    customButtons: [
      {
        name: 'codeinline',
        text: 'Code',
        tooltip: 'Inline code',
        format: 'code',
      },
    ],
    formats: {
      code: {
        styles: (theme: 'light' | 'dark') => ({
          backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f4f4f4',
          color: theme === 'dark' ? '#f8f8f2' : '#333',
          padding: '2px 4px',
          borderRadius: '3px',
          fontFamily: 'monospace',
        }),
      },
    },
  },
};

