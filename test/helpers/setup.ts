import { vi } from 'vitest'
import { config } from '@vue/test-utils'

config.global.plugins = []

global.ref = vi.fn()
global.computed = vi.fn()
global.reactive = vi.fn()
global.watch = vi.fn()
global.onMounted = vi.fn()
global.nextTick = vi.fn()

global.useState = vi.fn()
global.useRoute = vi.fn()
global.useRouter = vi.fn()
global.navigateTo = vi.fn()
global.$fetch = vi.fn()

global.usePermissions = vi.fn(() => ({
  hasAnyPermission: vi.fn(() => false),
  hasAllPermissions: vi.fn(() => false),
  checkPermissionCondition: vi.fn(() => false)
}))

global.useEnfyraAuth = vi.fn(() => ({
  me: { value: null }
}))

beforeEach(() => {
  vi.clearAllMocks()
})