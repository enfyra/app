import { getId } from '~/utils/common/helpers';

export const TABLE_DETAIL_PATH_MAP: Record<string, string> = {
  // Settings
  user_definition: "/settings/users",
  role_definition: "/settings/roles",
  route_definition: "/settings/routings",
  extension_definition: "/settings/extensions",
  websocket_definition: "/settings/websockets",
  bootstrap_script_definition: "/settings/bootstrap",
  oauth_config_definition: "/settings/oauth/config",
  oauth_account_definition: "/settings/oauth/accounts",

  // Storage
  storage_config_definition: "/storage/config",
  file_definition: "/storage/management/file",
  folder_definition: "/storage/management/folder",

  // Packages
  package_definition: "/packages",
};

type DetailPathResolver = (item: any) => string | null;

const CUSTOM_PATH_RESOLVERS: Record<string, DetailPathResolver> = {
  table_definition: (item) => {
    const name = item?.name;
    return name ? `/collections/${name}` : null;
  },
};

export function getDetailPathForTable(tableName: string, id: string | number): string | null {
  const basePath = TABLE_DETAIL_PATH_MAP[tableName];
  if (!basePath) return null;
  return `${basePath}/${id}`;
}

export function resolveRelationDetailPath(tableName: string, item: any): string | null {
  const resolver = CUSTOM_PATH_RESOLVERS[tableName];
  console.log('[resolveRelationDetailPath]', { tableName, hasResolver: !!resolver, item });
  if (resolver) {
    const result = resolver(item);
    console.log('[resolveRelationDetailPath] custom result:', result);
    return result;
  }

  const id = getId(item);
  if (!id) return null;
  return getDetailPathForTable(tableName, id);
}
