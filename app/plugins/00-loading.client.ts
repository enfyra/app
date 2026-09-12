export default defineNuxtPlugin(async () => {
  const { initialReady } = useInitialLoading();
  const mounted = ref(false);
  let hidden = false;
  let failed = false;
  
  const loadingHtml = `
    <div id="app-loading" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: var(--bg-app); display: flex; align-items: center; justify-content: center; z-index: 9999; font-family: system-ui, sans-serif; opacity: 1; transition: opacity 0.5s ease-out;">
      <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
        <div id="app-loading-mark" class="enfyra-loading-mark">
          <svg class="enfyra-loading-ring" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="var(--brand-500)" stroke-width="2" fill="none" 
              stroke-dasharray="60" stroke-dashoffset="40" stroke-linecap="round"/>
          </svg>
        </div>
        <p id="app-loading-message" role="status" style="color: var(--text-tertiary); font-size: 14px; margin: 0; font-weight: 500;">Starting your project…</p>
        <p id="app-loading-detail" hidden style="color: var(--text-tertiary); font-size: 13px; margin: -6px 0 0; text-align: center;">Check the deployment status or try again.</p>
        <button id="app-loading-retry" class="enfyra-loading-retry" type="button" hidden>Try again</button>
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

        #app-loading .enfyra-loading-retry {
          min-height: 36px;
          padding: 0 16px;
          border: 1px solid var(--brand-500);
          border-radius: 8px;
          background: var(--brand-500);
          color: var(--md-on-primary);
          font: inherit;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        #app-loading .enfyra-loading-retry:hover {
          background: var(--brand-600);
          border-color: var(--brand-600);
        }

        #app-loading .enfyra-loading-retry:focus-visible {
          outline: 2px solid var(--brand-400);
          outline-offset: 3px;
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
    if (failed || !mounted.value || !initialReady.value) return;

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
  nuxtApp.hook("app:error", () => {
    if (!failed) hideLoading();
  });

  watch(initialReady, () => {
    void hideWhenReady();
  }, { immediate: true });

  try {
    await $fetch('/_enfyra/ready', { retry: 0, timeout: 35_000 });
    const message = document.getElementById('app-loading-message');
    if (message) message.textContent = 'Loading your project…';
  } catch {
    failed = true;
    const loading = document.getElementById('app-loading');
    const mark = document.getElementById('app-loading-mark');
    const message = document.getElementById('app-loading-message');
    const detail = document.getElementById('app-loading-detail');
    const retry = document.getElementById('app-loading-retry');
    loading?.setAttribute('data-state', 'error');
    mark?.setAttribute('hidden', '');
    if (message) {
      message.setAttribute('role', 'alert');
      message.textContent = 'Your project is taking longer to start.';
    }
    detail?.removeAttribute('hidden');
    retry?.removeAttribute('hidden');
    retry?.addEventListener('click', () => window.location.reload(), { once: true });
  }
});
