import { defineEventHandler } from 'h3';
import { waitForBackend } from '../utils/backend-readiness';

export default defineEventHandler(async (event) => {
  const path = event.path.split('?')[0] || '';
  const isReadiness = path === '/_enfyra/ready';
  if (!isReadiness && !/^\/(api|assets|ws)(\/|$)/.test(path)) return;
  if (event.method === 'OPTIONS') return;
  await waitForBackend(event, useRuntimeConfig().public.apiUrl);
});
