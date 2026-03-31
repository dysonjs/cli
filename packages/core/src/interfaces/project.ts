export type ProjectType = 'single' | 'monorepo';
export type VersionStrategy = 'fixed';

export interface ProjectExternalConfig {
  type?: ProjectType;
  packageDir?: string;
  versionStrategy?: VersionStrategy;
}

export interface ProjectContext {
  cwd: string;
  rootDir: string;
  type: ProjectType;
  packageDir: string;
  versionStrategy?: VersionStrategy;
  packageDirs: string[];
  targetPackageDirs: string[];
  currentPackageDir?: string;
  isRoot: boolean;
}
