import { createCorsOriginProxyHandler } from '../utils/cors-origin-proxy';

export default createCorsOriginProxyHandler({
  method: 'POST',
  path: '/enfyra_cors_origin',
});
