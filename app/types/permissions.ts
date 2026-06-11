export type PermissionRule = {
  route: string;
  methods: string[];
  allowAll?: boolean;
};

export type PermissionCondition = {
  and?: (PermissionRule | PermissionCondition)[];
  or?: (PermissionRule | PermissionCondition)[];
  allowAll?: boolean;
  rootAdmin?: boolean;
};
