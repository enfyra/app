export type PermissionRule = {
  route: string;
  actions: string[];
  allowAll?: boolean;
};

export type PermissionCondition = {
  and?: (PermissionRule | PermissionCondition)[];
  or?: (PermissionRule | PermissionCondition)[];
  allowAll?: boolean;
};
