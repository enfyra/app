export default defineNuxtPlugin(() => {
  if (typeof window === "undefined") return;

  let lastServerId: string | null = null;

  // Intercept all fetch requests
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    try {
      const response = await originalFetch.apply(this, args);

      // Check server ID from response headers
      const serverId = response.headers.get("X-Server-Id");

      if (serverId) {
        // First API call - store server ID
        if (lastServerId === null) {
          lastServerId = serverId;
        } else if (serverId !== lastServerId) {
          // Server restarted - different ID

          window.location.reload();
        }
      }

      return response;
    } catch (error) {
      // Network error might indicate server restart
      if (lastServerId !== null) {
      }
      throw error;
    }
  };
});