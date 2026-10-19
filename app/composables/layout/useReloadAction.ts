import type { HeaderAction } from '~/types/ui';

interface ReloadActionOptions {
  reload: () => unknown | Promise<unknown>;
  id?: string;
  ariaLabel?: string;
  order?: number;
  loading?: HeaderAction['loading'];
  disabled?: HeaderAction['disabled'];
  show?: HeaderAction['show'];
  permission?: HeaderAction['permission'];
  hasUnsavedChanges?: () => boolean;
}

export function useReloadAction(options: ReloadActionOptions): HeaderAction {
  const { confirm } = useConfirm();

  async function reload() {
    if (options.hasUnsavedChanges?.()) {
      const ok = await confirm({
        title: 'Reload page?',
        content: 'Unsaved changes will be discarded and the latest data will be loaded.',
        confirmText: 'Reload',
        cancelText: 'Cancel',
      });
      if (!ok) return;
    }
    await options.reload();
  }

  return {
    id: options.id ?? 'reload-page',
    icon: 'lucide:refresh-cw',
    ariaLabel: options.ariaLabel ?? 'Reload',
    variant: 'outline',
    color: 'neutral',
    size: 'md',
    order: options.order ?? 0,
    loading: options.loading,
    disabled: options.disabled,
    show: options.show,
    permission: options.permission,
    onClick: reload,
  };
}
