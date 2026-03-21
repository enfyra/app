import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ExecResult {
  stdout: string;
  stderr: string;
}

function execCommand(
  cmd: string,
  args: string[],
  options: { cwd: string; timeout?: number }
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: options.cwd,
      shell: false,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timeoutMs = options.timeout || 120000;
    const timeoutId = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on('close', (code, signal) => {
      clearTimeout(timeoutId);

      if (code !== 0) {
        const error = new Error(
          `Command failed with exit code ${code}${signal ? ` (signal: ${signal})` : ''}\n${stderr}`
        );
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });

    child.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });
  });
}

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

    const args: string[] = [];
    if (packageManager === 'bun') {
      args.push('add', packageSpec);
    } else if (packageManager === 'yarn') {
      args.push('add', packageSpec);
    } else if (packageManager === 'pnpm') {
      args.push('add', packageSpec);
    } else {
      args.push('install', packageSpec, '--legacy-peer-deps');
    }

    const projectRoot = this.getProjectRoot();

    try {
      const { stderr } = await execCommand(packageManager, args, {
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

    const args: string[] = [];
    if (packageManager === 'bun') {
      args.push('remove', name);
    } else if (packageManager === 'yarn') {
      args.push('remove', name);
    } else if (packageManager === 'pnpm') {
      args.push('remove', name);
    } else {
      args.push('uninstall', name, '--legacy-peer-deps');
    }

    try {
      const { stderr } = await execCommand(packageManager, args, {
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
