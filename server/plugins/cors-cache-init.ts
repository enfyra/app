import { initCorsCache } from '../middleware/cors';

export default defineNitroPlugin(async (nitroApp) => {
  await initCorsCache();
});
