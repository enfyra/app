import { createCorsOriginProxyHandler } from '../../utils/cors-origin-proxy';

export default createCorsOriginProxyHandler({
  method: 'PATCH',
  path: '/cors_origin_definition/:id',
});
