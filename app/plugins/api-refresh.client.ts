export default defineNuxtPlugin(() => {
  if (typeof window === "undefined") return;

  let lastServerId: string | null = null;

  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    try {
      const response = await originalFetch.apply(this, args);

      const serverId = response.headers.get("X-Server-Id");

      if (serverId) {
        
        if (lastServerId === null) {
          lastServerId = serverId;
        } else if (serverId !== lastServerId) {

          window.location.reload();
        }
      }

      return response;
    } catch (error) {
      
      if (lastServerId !== null) {
      }
      throw error;
    }
  };
});