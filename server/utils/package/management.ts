import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
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
  private projectRootCache: string | null = null;

  getProjectRoot(): string {
    if (this.projectRootCache) return this.projectRootCache;

    if (process.env.PROJECT_ROOT) {
      this.projectRootCache = process.env.PROJECT_ROOT;
      return this.projectRootCache;
    }

    try {
      let searchDir = __dirname;

      while (searchDir !== path.dirname(searchDir)) {
        const packageJsonPath = path.join(searchDir, 'package.json');
        const appDirPath = path.join(searchDir, 'app');

        if (fsSync.existsSync(packageJsonPath) && fsSync.existsSync(appDirPath)) {
          this.projectRootCache = searchDir;
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
        this.projectRootCache = parts.slice(0, outputIndex).join(path.sep);
        return this.projectRootCache;
      }
    }

    this.projectRootCache = currentDir;
    return currentDir;
  }

  private getPackageManager(): string {
    const envPkgManager = process.env.PACKAGE_MANAGER;
    if (envPkgManager) {
      return envPkgManager;
    }

    const projectRoot = this.getProjectRoot();

    try {
      if (fsSync.existsSync(path.join(projectRoot, 'bun.lockb'))) {
        return 'bun';
      }
      if (fsSync.existsSync(path.join(projectRoot, 'yarn.lock'))) {
        return 'yarn';
      }
      if (fsSync.existsSync(path.join(projectRoot, 'package-lock.json'))) {
        return 'npm';
      }
      if (fsSync.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'))) {
        return 'pnpm';
      }
    } catch {
    }

    return 'npm';
  }

  async installPackage(options: PackageInstallOptions): Promise<{ version: string; description?: string }> {
    const { name, version = 'latest' } = options;
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

  async installBatch(packages: Array<{ name: string; version?: string }>): Promise<void> {
    if (packages.length === 0) return;

    const packageManager = this.getPackageManager();
    const projectRoot = this.getProjectRoot();

    const specs = packages.map((p) =>
      !p.version || p.version === 'latest' ? p.name : `${p.name}@${p.version}`,
    );

    const args: string[] = [];
    if (packageManager === 'bun') {
      args.push('add', ...specs);
    } else if (packageManager === 'yarn') {
      args.push('add', ...specs);
    } else if (packageManager === 'pnpm') {
      args.push('add', ...specs);
    } else {
      args.push('install', ...specs, '--legacy-peer-deps');
    }

    const timeout = Math.max(120000, packages.length * 30000);

    try {
      console.log(`Batch installing ${packages.length} packages: ${specs.join(' ')}`);
      const { stderr } = await execCommand(packageManager, args, {
        cwd: projectRoot,
        timeout,
      });

      if (stderr && !stderr.includes('WARN') && !stderr.includes('warning')) {
        console.warn(`Batch install stderr: ${stderr.substring(0, 500)}`);
      }

      console.log(`Batch install completed for ${packages.length} packages`);
    } catch (error: any) {
      console.error(`Batch install failed: ${error.message}, falling back to individual installs...`);

      for (const pkg of packages) {
        try {
          await this.installPackage({ name: pkg.name, version: pkg.version || 'latest' });
        } catch (e: any) {
          console.error(`Individual install failed for ${pkg.name}: ${e.message}`);
        }
      }
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

  isPackageInstalled(packageName: string): boolean {
    try {
      const projectRoot = this.getProjectRoot();
      const pkgPath = path.join(projectRoot, 'node_modules', packageName, 'package.json');
      return fsSync.existsSync(pkgPath);
    } catch {
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
