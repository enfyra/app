export function useDatabase() {
  const config = useRuntimeConfig();
  const dbType = config.public.dbType as 'postgres' | 'mysql' | 'mongodb' | 'mariadb';

  /**
   * Check if the current database is MongoDB
   */
  const isMongoDB = computed(() => dbType === 'mongodb');

  /**
   * Get the ID field name based on database type
   */
  const getIdFieldName = (): 'id' | '_id' => {
    return dbType === 'mongodb' ? '_id' : 'id';
  };

  /**
   * Get id value from an item, respecting the database type
   */
  const getId = (item: any): any => {
    if (!item) return null;
    
    let rawId = isMongoDB.value ? item._id ?? item.id : item.id ?? item._id;
    
    while (rawId && typeof rawId === 'object') {
      rawId = isMongoDB.value ? rawId._id ?? rawId.id : rawId.id ?? rawId._id;
    }
    
    return rawId;
  };

  /**
   * Delete id fields from an object based on database type
   */
  const deleteIds = (obj: any): void => {
    if (!obj) return;
    
    if (isMongoDB.value) {
      delete obj._id;
      delete obj.id; // Also delete id for safety
    } else {
      delete obj.id;
      delete obj._id; // Also delete _id for safety
    }
  };

  /**
   * Create an ID filter that works with the current database type
   */
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

