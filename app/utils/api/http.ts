export async function $fetch<T = any>(
  path: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    query?: Record<string, any>;
    baseURL?: string;
  } = {}
): Promise<T> {
  const {
    method = "GET",
    body,
    headers: optionHeaders = {},
    query = {},
    baseURL,
  } = options;
  if (!baseURL) {
    throw new Error('baseURL is required for $fetch');
  }

  const url = new URL(
    path.startsWith("/") ? path.slice(1) : path,
    baseURL.endsWith("/") ? baseURL : `${baseURL}/`
  );

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object') {
        url.searchParams.append(key, JSON.stringify(value));
      } else {
        url.searchParams.append(key, String(value));
      }
    }
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...optionHeaders,
  };

  const fetchOptions: RequestInit = {
    method: method.toUpperCase(),
    headers,
  };

  if (body && method.toUpperCase() !== "GET") {
    if (body instanceof FormData) {
      delete headers["Content-Type"]; // Let browser set boundary for FormData
      fetchOptions.body = body;
    } else {
      fetchOptions.body = JSON.stringify(body);
    }
  }

  try {
    const response = await fetch(url.toString(), fetchOptions);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText };
      }
      throw { response: { data: errorData }, status: response.status };
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return await response.json();
    } else {
      return (await response.text()) as T;
    }
  } catch (error) {
    throw error;
  }
}

