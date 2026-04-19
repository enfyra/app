import { createCorsOriginProxyHandler } from '../../utils/cors-origin-proxy';

export default createCorsOriginProxyHandler({
  method: 'DELETE',
  path: '/cors_origin_definition/:id',
});
