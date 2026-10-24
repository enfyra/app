export const ACCESS_TOKEN_KEY = "accessToken";
export const EXP_TIME_KEY = "exp_time";
export const REFRESH_TOKEN_KEY = "refreshToken";

export const DEFAULT_ME_FIELDS = [
  "id",
  "email",
  "isRootAdmin",
  "isSystem",
  "roles.id",
  "roles.name",
  ...["roles.routePermissions", "allowedRoutePermissions"].flatMap(prefix => [
    `${prefix}.id`,
    `${prefix}.isEnabled`,
    `${prefix}.role.id`,
    `${prefix}.allowedUsers.id`,
    `${prefix}.routeMethodConfigs.id`,
    `${prefix}.routeMethodConfigs.available`,
    `${prefix}.routeMethodConfigs.method.id`,
    `${prefix}.routeMethodConfigs.method.name`,
    `${prefix}.route.id`,
    `${prefix}.route.path`,
    `${prefix}.route.isEnabled`,
  ]),
];

export const DEFAULT_ME_DEEP = {
  roles: { limit: 0, deep: {
    routePermissions: { limit: 0, deep: {
      allowedUsers: { limit: 0 }, routeMethodConfigs: { limit: 0 },
    } },
  } },
  allowedRoutePermissions: { limit: 0, deep: {
    allowedUsers: { limit: 0 }, routeMethodConfigs: { limit: 0 },
  } },
};
