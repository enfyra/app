export function useDatabase() {
  type MetadataDatabaseType = 'postgres' | 'mysql' | 'mongodb' | 'mariadb' | 'sqlite';

  const dbContext = useState<{
    dbType: MetadataDatabaseType | null;
    pkField: 'id' | '_id' | null;
  }>("database:context", () => ({
    dbType: null,
    pkField: null,
  }));

  const dbType = computed(() => dbContext.value.dbType);
  const isMongoDB = computed(() => dbType.value === 'mongodb');

  const getIdFieldName = (): 'id' | '_id' => {
    return dbContext.value.pkField || (isMongoDB.value ? '_id' : 'id');
  };

  const getId = (item: any): any => {
    if (!item) return null;
    
    const idField = getIdFieldName();
    let rawId = idField === '_id' ? item._id ?? item.id : item.id ?? item._id;
    
    while (rawId && typeof rawId === 'object') {
      rawId = idField === '_id' ? rawId._id ?? rawId.id : rawId.id ?? rawId._id;
    }
    
    return rawId;
  };

  const deleteIds = (obj: any): void => {
    if (!obj) return;
    
    if (isMongoDB.value) {
      delete obj._id;
      delete obj.id; 
    } else {
      delete obj.id;
      delete obj._id; 
    }
  };

  const createIdFilter = (idValue: any, operator: string = '_eq'): any => {
    const fieldName = getIdFieldName();
    return {
      [fieldName]: { [operator]: idValue }
    };
  };

  return {
    dbType,
    isMongoDB,
    getIdFieldName,
    getId,
    deleteIds,
    createIdFilter,
  };
}
