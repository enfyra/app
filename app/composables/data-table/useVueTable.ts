export const useVueTableLazy = () => {
  const vueTableModule = ref<any>(null)
  const loading = ref(false)
  const initialized = ref(false)

  const initVueTable = async () => {
    if (vueTableModule.value || initialized.value) {
      return vueTableModule.value
    }

    loading.value = true
    initialized.value = true

    try {
      const module = await import('@tanstack/vue-table')
      vueTableModule.value = module
      return module
    } catch (error) {
      console.error('Failed to load @tanstack/vue-table:', error)
      initialized.value = false
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    vueTableModule: readonly(vueTableModule),
    loading: readonly(loading),
    initVueTable,
  }
}

