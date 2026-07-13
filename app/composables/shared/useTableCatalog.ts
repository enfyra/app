import type { ApiTableListResponse, TableApiResponse } from "~/types/database";

let clientCatalogRequest: Promise<TableApiResponse[] | null> | null = null;

export function useTableCatalog() {
  const tables = useState<TableApiResponse[]>("table-catalog:data", () => []);
  const fetched = useState<boolean>("table-catalog:fetched", () => false);
  const loading = useState<boolean>("table-catalog:loading", () => false);
  const epoch = useState<number>("table-catalog:epoch", () => 0);
  const active = ref(false);
  const { execute } = useApi<ApiTableListResponse>("/enfyra_table", {
    query: {
      fields: "id,name,alias,description,icon,isSystem",
      limit: 0,
      sort: "name",
    },
    errorContext: "Fetch Table Catalog",
  });

  async function requestCatalog(): Promise<TableApiResponse[] | null> {
    loading.value = true;
    try {
      const response = await execute() as ApiTableListResponse | null;
      if (!response?.data) return null;
      tables.value = response.data;
      fetched.value = true;
      return tables.value;
    } finally {
      loading.value = false;
    }
  }

  async function loadTableCatalog(options?: { force?: boolean }) {
    active.value = true;
    if (!options?.force && fetched.value) return tables.value;
    if (import.meta.client && clientCatalogRequest) return clientCatalogRequest;

    let request: Promise<TableApiResponse[] | null>;
    request = requestCatalog().finally(() => {
      if (import.meta.client && clientCatalogRequest === request) {
        clientCatalogRequest = null;
      }
    });
    if (import.meta.client) clientCatalogRequest = request;
    return request;
  }

  function invalidateTableCatalog() {
    tables.value = [];
    fetched.value = false;
    clientCatalogRequest = null;
    epoch.value += 1;
  }

  watch(epoch, () => {
    if (active.value) void loadTableCatalog({ force: true });
  });

  function getTableById(id: string | number | null | undefined) {
    if (id == null) return null;
    return tables.value.find((table) => String(table.id) === String(id)) ?? null;
  }

  function getTableByName(name: string | null | undefined) {
    if (!name) return null;
    return tables.value.find((table) => table.name === name) ?? null;
  }

  return {
    tables: readonly(tables),
    loading: readonly(loading),
    fetched: readonly(fetched),
    loadTableCatalog,
    invalidateTableCatalog,
    getTableById,
    getTableByName,
  };
}
