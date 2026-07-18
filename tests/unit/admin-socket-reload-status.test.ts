import { beforeEach, describe, expect, it } from 'vitest';

import {
  activeReloads,
  dismissReloadBanner,
  markReloadFailed,
  reloadDoneCountdown,
  reloadFailureMessage,
  showReloadBanner,
} from '../../app/composables/shared/useAdminSocket';

describe('useAdminSocket reload status', () => {
  beforeEach(() => {
    dismissReloadBanner();
  });

  it('keeps a visible failure state and clears the matching pending reload', () => {
    activeReloads.value = [
      {
        key: 'instance:route',
        flow: 'route',
        steps: ['route'],
        startedAt: Date.now(),
      },
    ];
    reloadDoneCountdown.value = 5;

    markReloadFailed('instance:route');

    expect(activeReloads.value).toEqual([]);
    expect(reloadDoneCountdown.value).toBe(0);
    expect(reloadFailureMessage.value).toBe(
      'The saved configuration was not activated. Check Admin Logs before continuing.',
    );
    expect(showReloadBanner.value).toBe(true);
  });
});
