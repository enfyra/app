import { describe, expect, it, vi } from 'vitest';
import { VERSIONED_CODE_TABLES, compareCodeVersions, nextCodeVersion, prepareCodeUpdate, validCodeVersion } from '~/utils/code-version';

describe('dynamic code versions', () => {
  it('increments the patch segment and follows the server ordering', () => {
    expect(nextCodeVersion('1.0.0')).toBe('1.0.1');
    expect(nextCodeVersion('v3.0.1')).toBe('3.0.2');
    expect(nextCodeVersion('2.3.4-patch-1')).toBe('2.3.5');
    expect(compareCodeVersions('1.0.10', '1.0.9')).toBe(1);
    expect(compareCodeVersions('1.0.0-patch-1', '1.0.0')).toBe(1);
    expect(validCodeVersion('2.0')).toBe(false);
    expect(validCodeVersion('2.0.0+build')).toBe(false);
  });

  it('reads only the current version and confirms without mutating the draft', async () => {
    const read = vi.fn().mockResolvedValue({ data: [{ version: '3.0.1' }] });
    const confirm = vi.fn().mockResolvedValue('4.0.0');
    const draft = { sourceCode: 'return 1;', version: '3.0.1' };
    expect(await prepareCodeUpdate('/api/enfyra_route_handler/7', draft, read, confirm)).toEqual({ ...draft, version: '4.0.0' });
    expect(draft.version).toBe('3.0.1');
    expect(read).toHaveBeenCalledWith('/api/enfyra_route_handler', { query: { fields: 'version', limit: 1, filter: { id: { _eq: '7' } } } });
    expect(confirm).toHaveBeenCalledWith({ tableName: 'enfyra_route_handler', recordId: '7', currentVersion: '3.0.1', suggestedVersion: '3.0.2' });
  });

  it('reads each code table through a filtered collection, including Mongo identities', async () => {
    for (const table of VERSIONED_CODE_TABLES) {
      const read = vi.fn().mockResolvedValue({ data: [{ version: '1.0.0' }] });
      await prepareCodeUpdate(`/api/${table}/507f1f77bcf86cd799439011`, {}, read, async () => '1.0.1', '_id');
      expect(read).toHaveBeenCalledWith(`/api/${table}`, { query: { fields: 'version', limit: 1, filter: { _id: { _eq: '507f1f77bcf86cd799439011' } } } });
    }
  });

  it('keeps an explicitly advancing version as the editable suggestion', async () => {
    const confirm = vi.fn().mockResolvedValue('2.0.0');
    await prepareCodeUpdate('/api/enfyra_extension/8', { version: '2.0.0' }, async () => ({ data: [{ version: '1.0.0' }] }), confirm);
    expect(confirm.mock.calls[0]?.[0].suggestedVersion).toBe('2.0.0');
  });

  it('never writes on cancellation or unreadable current state', async () => {
    await expect(prepareCodeUpdate('/api/enfyra_helper/1', {}, async () => ({ data: [{ version: '1.0.0' }] }), async () => null)).rejects.toMatchObject({ name: 'AbortError' });
    const confirm = vi.fn();
    await expect(prepareCodeUpdate('/api/enfyra_oauth_config/1', {}, async () => ({ data: [] }), confirm)).rejects.toThrow('current version');
    expect(confirm).not.toHaveBeenCalled();
  });

  it('leaves business tables alone and rejects a non-advancing confirmation', async () => {
    const read = vi.fn();
    const body = { title: 'Task' };
    expect(await prepareCodeUpdate('/api/tasks/1', body, read, vi.fn())).toBe(body);
    expect(read).not.toHaveBeenCalled();
    await expect(prepareCodeUpdate('/api/enfyra_flow_step/1', {}, async () => ({ data: [{ version: '1.0.0' }] }), async () => '1.0.0')).rejects.toThrow('greater');
  });
});
