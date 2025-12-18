export function useDatabase() {
  const config = useRuntimeConfig();
  const dbType = config.public.dbType as 'postgres' | 'mysql' | 'mongodb' | 'mariadb';

  const isMongoDB = computed(() => dbType === 'mongodb');

  const getIdFieldName = (): 'id' | '_id' => {
    return dbType === 'mongodb' ? '_id' : 'id';
  };

  const getId = (item: any): any => {
    if (!item) return null;
    
    let rawId = isMongoDB.value ? item._id ?? item.id : item.id ?? item._id;
    
    while (rawId && typeof rawId === 'object') {
      rawId = isMongoDB.value ? rawId._id ?? rawId.id : rawId.id ?? rawId._id;
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

