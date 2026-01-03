import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface PackageInstallOptions {
  name: string;
  version?: string;
  flags?: string;
}

export class PackageManagementService {
  private getProjectRoot(): string {
    try {
      const fsSync = require('fs');
      let searchDir = __dirname;
      
      while (searchDir !== path.dirname(searchDir)) {
        const packageJsonPath = path.join(searchDir, 'package.json');
        const appDirPath = path.join(searchDir, 'app');
        
        if (fsSync.existsSync(packageJsonPath) && fsSync.existsSync(appDirPath)) {
          return searchDir;
        }
        
        const parentDir = path.dirname(searchDir);
        if (parentDir === searchDir) {
          break;
        }
        searchDir = parentDir;
      }
    } catch {
    }
    
    let currentDir = process.cwd();
    if (currentDir.includes('.output')) {
      const parts = currentDir.split(path.sep);
      const outputIndex = parts.indexOf('.output');
      if (outputIndex > 0) {
        return parts.slice(0, outputIndex).join(path.sep);
      }
    }
    
    return currentDir;
  }

  private getPackageManager(): string {
    const envPkgManager = process.env.PACKAGE_MANAGER;
    if (envPkgManager) {
      return envPkgManager;
    }

    const projectRoot = this.getProjectRoot();

    try {
      if (require('fs').existsSync(path.join(projectRoot, 'bun.lockb'))) {
        return 'bun';
      }
      if (require('fs').existsSync(path.join(projectRoot, 'yarn.lock'))) {
        return 'yarn';
      }
      if (require('fs').existsSync(path.join(projectRoot, 'package-lock.json'))) {
        return 'npm';
      }
      if (require('fs').existsSync(path.join(projectRoot, 'pnpm-lock.yaml'))) {
        return 'pnpm';
      }
    } catch {
    }

    return 'npm';
  }

  async installPackage(options: PackageInstallOptions): Promise<{ version: string; description?: string }> {
    const { name, version = 'latest', flags = '' } = options;
    const packageManager = this.getPackageManager();
    const packageSpec = version === 'latest' ? name : `${name}@${version}`;

    let command: string;
    if (packageManager === 'bun') {
      command = `bun add ${packageSpec} ${flags}`.trim();
    } else if (packageManager === 'yarn') {
      command = `yarn add ${packageSpec} ${flags}`.trim();
    } else if (packageManager === 'pnpm') {
      command = `pnpm add ${packageSpec} ${flags}`.trim();
    } else {
      command = `npm install ${packageSpec} --legacy-peer-deps ${flags}`.trim();
    }

    const projectRoot = this.getProjectRoot();

    try {
      const { stderr } = await execAsync(command, {
        cwd: projectRoot,
        timeout: 120000,
      });

      if (stderr && !stderr.includes('WARN') && !stderr.includes('warning')) {
        throw new Error(stderr);
      }

      const packageInfo = await this.getPackageInfo(name);
      return {
        version: packageInfo.version,
        description: packageInfo.description,
      };
    } catch (error: any) {
      throw new Error(`Failed to install package ${name}: ${error.message}`);
    }
  }

  async uninstallPackage(name: string): Promise<void> {
    const packageManager = this.getPackageManager();
    const projectRoot = this.getProjectRoot();

    let command: string;
    if (packageManager === 'bun') {
      command = `bun remove ${name}`;
    } else if (packageManager === 'yarn') {
      command = `yarn remove ${name}`;
    } else if (packageManager === 'pnpm') {
      command = `pnpm remove ${name}`;
    } else {
      command = `npm uninstall ${name} --legacy-peer-deps`;
    }

    try {
      const { stderr } = await execAsync(command, {
        cwd: projectRoot,
        timeout: 120000,
      });

      if (stderr && !stderr.includes('WARN') && !stderr.includes('warning') && !stderr.includes('not found')) {
        throw new Error(stderr);
      }
    } catch (error: any) {
      const errorMsg = error.message || error.toString();

      const isPackageNotFound =
        errorMsg.includes('not found') ||
        errorMsg.includes('ENOENT') ||
        errorMsg.includes('no such file') ||
        errorMsg.includes('not installed');

      if (isPackageNotFound) {
        console.log(`Package ${name} not found in node_modules, skipping uninstall`);
        return;
      }
      throw new Error(`Failed to uninstall package ${name}: ${errorMsg}`);
    }
  }

  async isPackageInstalled(packageName: string): Promise<boolean> {
    try {
      const projectRoot = this.getProjectRoot();
      const projectPackageJsonPath = path.join(projectRoot, 'package.json');
      const packageJsonContent = await fs.readFile(projectPackageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      const allDependencies = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {}),
      };

      return packageName in allDependencies;
    } catch (error) {
      console.error(`Error checking package installation status for ${packageName}:`, error);
      return false;
    }
  }

  private async getPackageInfo(packageName: string): Promise<{ version: string; description?: string }> {
    try {
      const projectRoot = this.getProjectRoot();
      const packageJsonPath = path.join(projectRoot, 'node_modules', packageName, 'package.json');
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      return {
        version: packageJson.version,
        description: packageJson.description,
      };
    } catch (error) {
      throw new Error(`Could not get package info: ${error}`);
    }
  }
}

export const packageManagementService = new PackageManagementService();
