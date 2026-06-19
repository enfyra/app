import { getId } from '~/utils/common/helpers';

export const TABLE_DETAIL_PATH_MAP: Record<string, string> = {
  // Settings
  enfyra_user: "/settings/users",
  enfyra_role: "/settings/roles",
  enfyra_method: "/settings/methods",
  enfyra_route: "/settings/routes",
  enfyra_extension: "/settings/extensions",
  enfyra_websocket: "/settings/websockets",
  enfyra_bootstrap_script: "/settings/bootstrap",
  enfyra_oauth_config: "/settings/oauth/config",
  enfyra_oauth_account: "/settings/oauth/accounts",

  // Storage
  enfyra_storage_config: "/storage/config",
  enfyra_file: "/storage/management/file",
  enfyra_folder: "/storage/management/folder",

  // Packages
  enfyra_package: "/packages",
};

type DetailPathResolver = (item: any) => string | null;

const CUSTOM_PATH_RESOLVERS: Record<string, DetailPathResolver> = {
  enfyra_table: (item) => {
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
  if (resolver) {
    return resolver(item);
  }

  const id = getId(item);
  if (!id) return null;
  return getDetailPathForTable(tableName, id);
}
