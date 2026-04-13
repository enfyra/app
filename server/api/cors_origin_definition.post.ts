import { createCorsOriginProxyHandler } from '../utils/cors-origin-proxy';

export default createCorsOriginProxyHandler({
  method: 'POST',
  path: '/cors_origin_definition',
});
