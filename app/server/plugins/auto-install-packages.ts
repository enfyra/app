import { packageManagementService } from '../../utils/server/package/management'

export default defineNitroPlugin(async (nitroApp) => {
  console.log('🔍 Checking for missing packages...')

  try {
    const apiUrl = process.env.API_URL

    if (!apiUrl) {
      console.warn('⚠️  API_URL not set, skipping package auto-install')
      return
    }

    const response = await fetch(`${apiUrl}/package_definition`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.warn(`⚠️  Failed to fetch packages: ${response.statusText}`)
      return
    }

    const data = await response.json()
    const packages = data?.data || []

    const appPackages = packages.filter((p: any) => p.type === 'App' && p.isEnabled)

    for (const pkg of appPackages) {
      const isInstalled = await packageManagementService.isPackageInstalled(pkg.name)

      if (!isInstalled) {
        console.log(`📦 Installing package: ${pkg.name}@${pkg.version || 'latest'}`)

        try {
          await packageManagementService.installPackage({
            name: pkg.name,
            version: pkg.version || 'latest',
          })

          console.log(`✅ Successfully installed ${pkg.name}`)
        } catch (error: any) {
          console.error(`❌ Failed to install ${pkg.name}:`, error.message)
        }
      } else {
        console.log(`✓ Package ${pkg.name} already installed`)
      }
    }

    console.log('✅ Package auto-install check complete')
  } catch (error: any) {
    console.error('❌ Error during package auto-install:', error.message)
  }
})
