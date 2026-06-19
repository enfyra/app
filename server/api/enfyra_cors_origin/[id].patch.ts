import { createCorsOriginProxyHandler } from '../../utils/cors-origin-proxy';

export default createCorsOriginProxyHandler({
  method: 'PATCH',
  path: '/enfyra_cors_origin/:id',
});
