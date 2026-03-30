import { packageManagementService } from '../utils/package/management'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 5000

async function fetchPackagesWithRetry(apiUrl: string): Promise<any[]> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${apiUrl}/package_definition`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data?.data || []
    } catch (error: any) {
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt
        console.warn(`Failed to fetch packages (attempt ${attempt}/${MAX_RETRIES}): ${error.message}, retrying in ${delay}ms...`)
        await new Promise((r) => setTimeout(r, delay))
      } else {
        throw error
      }
    }
  }
  return []
}

export default defineNitroPlugin(async (nitroApp) => {
  console.log('Checking for missing packages...')

  try {
    const apiUrl = process.env.API_URL

    if (!apiUrl) {
      console.warn('API_URL not set, skipping package auto-install')
      return
    }

    const packages = await fetchPackagesWithRetry(apiUrl)
    const appPackages = packages.filter((p: any) => p.type === 'App' && p.isEnabled)

    const missing = appPackages.filter(
      (pkg: any) => !packageManagementService.isPackageInstalled(pkg.name),
    )

    if (missing.length === 0) {
      console.log(`All ${appPackages.length} app packages already installed`)
      return
    }

    console.log(`${missing.length} packages missing, batch installing...`)

    await packageManagementService.installBatch(
      missing.map((pkg: any) => ({ name: pkg.name, version: pkg.version || 'latest' })),
    )

    console.log('Package auto-install complete')
  } catch (error: any) {
    console.error('Error during package auto-install:', error.message)
  }
})
