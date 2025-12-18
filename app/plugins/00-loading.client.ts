export default defineNuxtPlugin(() => {
  
  const loadingHtml = `
    <div id="app-loading" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgb(9, 9, 11); display: flex; align-items: center; justify-content: center; z-index: 9999; font-family: system-ui, sans-serif; opacity: 1; transition: opacity 0.5s ease-out;">
      <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
        <div style="width: 48px; height: 48px;">
          <svg style="width: 48px; height: 48px; animate-spin animation: spin 1s linear infinite;" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="rgb(59, 130, 246)" stroke-width="2" fill="none" 
              stroke-dasharray="60" stroke-dashoffset="40" stroke-linecap="round"/>
          </svg>
        </div>
        <p style="color: rgb(161, 161, 170); font-size: 14px; margin: 0; font-weight: 500;">Enfyra Loading...</p>
      </div>
      
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        svg {
          animation: spin 1s linear infinite;
        }
      </style>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", loadingHtml);

  const nuxtApp = useNuxtApp();
  nuxtApp.hook("app:mounted", () => {
    const loading = document.getElementById("app-loading");
    if (loading) {
      setTimeout(() => {
        loading.style.opacity = "0";
        setTimeout(() => {
          loading.remove();
        }, 500);
      }, 800);
    }
  });
});
