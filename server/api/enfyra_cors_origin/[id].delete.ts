import { createCorsOriginProxyHandler } from '../../utils/cors-origin-proxy';

export default createCorsOriginProxyHandler({
  method: 'DELETE',
  path: '/enfyra_cors_origin/:id',
});
