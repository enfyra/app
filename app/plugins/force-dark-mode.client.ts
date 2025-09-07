export default defineNuxtPlugin(() => {
  // Force dark mode immediately
  if (process.client) {
    document.documentElement.classList.add('dark')
    
    // Override any localStorage settings to force dark
    localStorage.setItem('nuxt-color-mode', 'dark')
    
    // Watch for any attempts to remove dark class and re-add it
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (!document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.add('dark')
          }
        }
      })
    })
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
  }
})