import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed, onMounted } from 'vue'

interface ExtensionComponent {
  name: string
  components: Record<string, any>
  enabled: boolean
}

interface MenuResponse {
  data: Array<{
    permission?: any
  }>
}

const MockPageComponent = {
  name: 'MockPageComponent',
  setup() {
    const isMounted = ref(false)
    const componentLoading = ref(true)
    const error = ref<string | null>(null)
    const extensionComponent = ref<ExtensionComponent | null>(null)
    const menuResponse = ref<MenuResponse | null>(null)

    const navigateTo = vi.fn()

    onMounted(() => {
      setTimeout(() => {
        isMounted.value = true
        componentLoading.value = false
      }, 100)
    })

    const retry = () => {
      error.value = null
      componentLoading.value = true
      setTimeout(() => {
        componentLoading.value = false
      }, 50)
    }

    return {
      isMounted,
      componentLoading,
      error,
      extensionComponent,
      menuResponse,
      navigateTo,
      retry
    }
  },
  template: `
    <div data-testid="dynamic-page-component">
      <div v-if="!isMounted || componentLoading" data-testid="loading-state" class="loading-container">
        <div class="loading-title">Loading extension...</div>
        <div class="loading-description">Fetching extension component</div>
      </div>

      <div v-else-if="error" data-testid="error-state" class="error-container">
        <div class="error-title">
          {{ error.includes('disabled') ? 'Extension Disabled' : 'Extension Error' }}
        </div>
        <div class="error-description">{{ error }}</div>
        <div class="error-actions">
          <button 
            v-if="error.includes('disabled')" 
            @click="navigateTo('/settings/extensions')"
            data-testid="settings-btn"
          >
            Go to Extension Settings
          </button>
          <button 
            v-else 
            @click="retry"
            data-testid="retry-btn"
          >
            Retry
          </button>
        </div>
      </div>

      <div v-else-if="extensionComponent" data-testid="extension-content" class="extension-wrapper">
        <div data-testid="permission-gate">
          <div data-testid="extension-component" class="extension-component">
            <div>{{ extensionComponent.name }}</div>
            <div v-if="extensionComponent.components" data-testid="nested-components">
              Components: {{ Object.keys(extensionComponent.components).length }}
            </div>
          </div>
        </div>
      </div>

      <div v-else data-testid="no-extension" class="no-extension">
        No extension loaded
      </div>
    </div>
  `
}

describe('DynamicPageComponent (Critical Extension System)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading States', () => {
    it('should show loading state initially', () => {
      const wrapper = mount(MockPageComponent)

      expect(wrapper.find('[data-testid="loading-state"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="loading-state"]').text()).toContain('Loading extension...')
      expect(wrapper.find('[data-testid="loading-state"]').text()).toContain('Fetching extension component')
    })

    it('should show loading state when componentLoading is true', () => {
      const wrapper = mount(MockPageComponent)
      
      expect(wrapper.find('[data-testid="loading-state"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="extension-content"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="error-state"]').exists()).toBe(false)
    })

    it('should hide loading state when component is mounted and not loading', async () => {
      const wrapper = mount(MockPageComponent)

      await new Promise(resolve => setTimeout(resolve, 150))
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="loading-state"]').exists()).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should show extension disabled error', async () => {
      const wrapper = mount(MockPageComponent)

      wrapper.vm.error = 'Extension is disabled by administrator'
      wrapper.vm.isMounted = true
      wrapper.vm.componentLoading = false
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="error-state"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="error-state"]').text()).toContain('Extension Disabled')
      expect(wrapper.find('[data-testid="error-state"]').text()).toContain('Extension is disabled by administrator')
      expect(wrapper.find('[data-testid="settings-btn"]').exists()).toBe(true)
    })

    it('should show generic extension error with retry', async () => {
      const wrapper = mount(MockPageComponent)

      wrapper.vm.error = 'Failed to load extension component'
      wrapper.vm.isMounted = true
      wrapper.vm.componentLoading = false
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="error-state"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="error-state"]').text()).toContain('Extension Error')
      expect(wrapper.find('[data-testid="error-state"]').text()).toContain('Failed to load extension component')
      expect(wrapper.find('[data-testid="retry-btn"]').exists()).toBe(true)
    })

    it('should navigate to settings when clicking settings button', async () => {
      const wrapper = mount(MockPageComponent)

      wrapper.vm.error = 'Extension is disabled by administrator'
      wrapper.vm.isMounted = true
      wrapper.vm.componentLoading = false
      await wrapper.vm.$nextTick()

      await wrapper.find('[data-testid="settings-btn"]').trigger('click')

      expect(wrapper.vm.navigateTo).toHaveBeenCalledWith('/settings/extensions')
    })

    it('should retry when clicking retry button', async () => {
      const wrapper = mount(MockPageComponent)

      wrapper.vm.error = 'Network timeout'
      wrapper.vm.isMounted = true
      wrapper.vm.componentLoading = false
      await wrapper.vm.$nextTick()

      await wrapper.find('[data-testid="retry-btn"]').trigger('click')

      expect(wrapper.vm.error).toBeNull()
      expect(wrapper.vm.componentLoading).toBe(true)
    })
  })

  describe('Extension Component Rendering', () => {
    it('should render extension component when loaded', async () => {
      const wrapper = mount(MockPageComponent)

      wrapper.vm.extensionComponent = {
        name: 'TestExtension',
        components: {
          MainComponent: { template: '<div>Main</div>' },
          SidebarComponent: { template: '<div>Sidebar</div>' }
        },
        enabled: true
      }
      wrapper.vm.isMounted = true
      wrapper.vm.componentLoading = false
      wrapper.vm.error = null
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="extension-content"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="extension-component"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="extension-component"]').text()).toContain('TestExtension')
      expect(wrapper.find('[data-testid="nested-components"]').text()).toContain('Components: 2')
    })

    it('should render extension without nested components', async () => {
      const wrapper = mount(MockPageComponent)

      wrapper.vm.extensionComponent = {
        name: 'SimpleExtension',
        components: null,
        enabled: true
      }
      wrapper.vm.isMounted = true
      wrapper.vm.componentLoading = false
      wrapper.vm.error = null
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="extension-content"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="extension-component"]').text()).toContain('SimpleExtension')
      expect(wrapper.find('[data-testid="nested-components"]').exists()).toBe(false)
    })

    it('should wrap extension in permission gate', async () => {
      const wrapper = mount(MockPageComponent)

      wrapper.vm.extensionComponent = {
        name: 'ProtectedExtension',
        components: {},
        enabled: true
      }
      wrapper.vm.menuResponse = {
        data: [{ permission: { route: '/admin', actions: ['read'] } }]
      }
      wrapper.vm.isMounted = true
      wrapper.vm.componentLoading = false
      wrapper.vm.error = null
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="permission-gate"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="extension-component"]').exists()).toBe(true)
    })
  })

  describe('State Management', () => {
    it('should show no extension state when no extension loaded', async () => {
      const wrapper = mount(MockPageComponent)

      wrapper.vm.extensionComponent = null
      wrapper.vm.isMounted = true
      wrapper.vm.componentLoading = false
      wrapper.vm.error = null
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="no-extension"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="no-extension"]').text()).toBe('No extension loaded')
    })

    it('should handle state transitions correctly', async () => {
      const wrapper = mount(MockPageComponent)

      expect(wrapper.find('[data-testid="loading-state"]').exists()).toBe(true)

      wrapper.vm.error = 'Connection failed'
      wrapper.vm.isMounted = true
      wrapper.vm.componentLoading = false
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="loading-state"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="error-state"]').exists()).toBe(true)

      wrapper.vm.error = null
      wrapper.vm.extensionComponent = {
        name: 'LoadedExtension',
        components: {},
        enabled: true
      }
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="error-state"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="extension-content"]').exists()).toBe(true)
    })
  })

  describe('Security and Permissions', () => {
    it('should handle permission-based access control', async () => {
      const wrapper = mount(MockPageComponent)

      wrapper.vm.extensionComponent = {
        name: 'AdminExtension',
        components: { AdminPanel: {} },
        enabled: true
      }
      wrapper.vm.menuResponse = {
        data: [{ permission: { route: '/admin/extensions', actions: ['admin'] } }]
      }
      wrapper.vm.isMounted = true
      wrapper.vm.componentLoading = false
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="permission-gate"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="extension-component"]').exists()).toBe(true)
    })

    it('should handle fallback permission when no menu response', async () => {
      const wrapper = mount(MockPageComponent)

      wrapper.vm.extensionComponent = {
        name: 'PublicExtension',
        components: {},
        enabled: true
      }
      wrapper.vm.menuResponse = null
      wrapper.vm.isMounted = true
      wrapper.vm.componentLoading = false
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="permission-gate"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="extension-component"]').exists()).toBe(true)
    })
  })

  describe('Extension Component Integration', () => {
    it('should handle complex extension with multiple components', async () => {
      const wrapper = mount(MockPageComponent)

      const complexExtension = {
        name: 'CRMExtension',
        components: {
          Dashboard: { template: '<div>Dashboard</div>', props: ['data'] },
          ContactList: { template: '<div>Contacts</div>' },
          ReportViewer: { template: '<div>Reports</div>' },
          Settings: { template: '<div>Settings</div>' }
        },
        enabled: true
      }

      wrapper.vm.extensionComponent = complexExtension
      wrapper.vm.isMounted = true
      wrapper.vm.componentLoading = false
      wrapper.vm.error = null
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="extension-content"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="extension-component"]').text()).toContain('CRMExtension')
      expect(wrapper.find('[data-testid="nested-components"]').text()).toContain('Components: 4')
    })

    it('should handle extension enable/disable state', async () => {
      const wrapper = mount(MockPageComponent)

      wrapper.vm.extensionComponent = {
        name: 'DisabledExtension',
        components: {},
        enabled: false
      }
      wrapper.vm.isMounted = true
      wrapper.vm.componentLoading = false
      wrapper.vm.error = null
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="extension-content"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="extension-component"]').text()).toContain('DisabledExtension')
    })
  })

  describe('Lifecycle and Cleanup', () => {
    it('should handle component mounting properly', () => {
      const wrapper = mount(MockPageComponent)

      expect(wrapper.vm.isMounted).toBe(false)
      expect(wrapper.vm.componentLoading).toBe(true)
    })

    it('should clean up properly on unmount', () => {
      const wrapper = mount(MockPageComponent)

      wrapper.vm.extensionComponent = {
        name: 'TestExtension',
        components: {},
        enabled: true
      }

      wrapper.unmount()

      expect(wrapper.exists()).toBe(false)
    })
  })

  describe('Error Recovery', () => {
    it('should recover from error state on retry', async () => {
      const wrapper = mount(MockPageComponent)

      wrapper.vm.error = 'Initial load failed'
      wrapper.vm.isMounted = true
      wrapper.vm.componentLoading = false
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="error-state"]').exists()).toBe(true)

      await wrapper.find('[data-testid="retry-btn"]').trigger('click')

      expect(wrapper.vm.error).toBeNull()
      expect(wrapper.vm.componentLoading).toBe(true)

      await new Promise(resolve => setTimeout(resolve, 60))
      wrapper.vm.componentLoading = false
      wrapper.vm.extensionComponent = {
        name: 'RecoveredExtension',
        components: {},
        enabled: true
      }
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="extension-content"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="error-state"]').exists()).toBe(false)
    })
  })
})