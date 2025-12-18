

export const getId = (item: any): string | null => {
  const id = item?.id || item?._id;
  return id ? String(id) : null;
};

