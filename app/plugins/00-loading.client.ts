export default defineNuxtPlugin(() => {
  const { initialReady } = useInitialLoading();
  const mounted = ref(false);
  let hidden = false;
  
  const loadingHtml = `
    <div id="app-loading" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: var(--bg-app); display: flex; align-items: center; justify-content: center; z-index: 9999; font-family: system-ui, sans-serif; opacity: 1; transition: opacity 0.5s ease-out;">
      <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
        <div class="enfyra-loading-mark">
          <svg class="enfyra-loading-ring" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="var(--brand-500)" stroke-width="2" fill="none" 
              stroke-dasharray="60" stroke-dashoffset="40" stroke-linecap="round"/>
          </svg>
        </div>
        <p style="color: var(--text-tertiary); font-size: 14px; margin: 0; font-weight: 500;">Enfyra Loading...</p>
      </div>
      
      <style>
        #app-loading .enfyra-loading-mark {
          position: relative;
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
        }

        #app-loading .enfyra-loading-ring {
          position: absolute;
          inset: 0;
          width: 48px;
          height: 48px;
          animation: enfyra-loading-spin 1s linear infinite;
          filter: drop-shadow(0 0 18px color-mix(in srgb, var(--brand-500) 22%, transparent));
        }

        @keyframes enfyra-loading-spin {
          to { transform: rotate(360deg); }
        }
      </style>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", loadingHtml);

  function hideLoading() {
    if (hidden) return;
    hidden = true;

    const loading = document.getElementById("app-loading");
    if (!loading) return;

    loading.style.opacity = "0";
    setTimeout(() => {
      loading.remove();
    }, 500);
  }

  async function hideWhenReady() {
    if (!mounted.value || !initialReady.value) return;

    await nextTick();
    requestAnimationFrame(() => {
      setTimeout(hideLoading, 150);
    });
  }

  const nuxtApp = useNuxtApp();
  nuxtApp.hook("app:mounted", () => {
    mounted.value = true;
    void hideWhenReady();
  });

  watch(initialReady, () => {
    void hideWhenReady();
  }, { immediate: true });
});
