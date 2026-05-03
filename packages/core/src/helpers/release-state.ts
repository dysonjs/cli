import fs from 'fs-extra';
import path from 'path';
import execa from 'execa';

import { ReleaseState } from '../interfaces';

const RELEASE_STATE_RELATIVE_PATH = path.join('.dy-cli', 'release', 'state.json');
const LEGACY_CHANGESET_DIR = '.changeset';

export function getReleaseStatePath(cwd: string) {
  return path.join(cwd, RELEASE_STATE_RELATIVE_PATH);
}

export function getLegacyChangesetDir(cwd: string) {
  return path.join(cwd, LEGACY_CHANGESET_DIR);
}

export async function readReleaseState(cwd: string): Promise<ReleaseState | null> {
  const releaseStatePath = getReleaseStatePath(cwd);
  if (!(await fs.pathExists(releaseStatePath))) {
    return null;
  }

  return (await fs.readJSON(releaseStatePath)) as ReleaseState;
}

export async function writeReleaseState(cwd: string, state: ReleaseState): Promise<void> {
  await fs.outputJSON(getReleaseStatePath(cwd), state, { spaces: 2 });
}

export async function ensureReleaseState(cwd: string): Promise<ReleaseState> {
  const existingState = await readReleaseState(cwd);
  if (existingState) {
    return existingState;
  }

  const migratedState = await migrateLegacyChangesetState(cwd);
  if (migratedState) {
    return migratedState;
  }

  return createDefaultReleaseState();
}

export async function enterPrereleaseMode(cwd: string, tag: string): Promise<ReleaseState> {
  const state: ReleaseState = {
    schemaVersion: 1,
    mode: 'pre',
    tag,
  };
  await writeReleaseState(cwd, state);
  return state;
}

export async function exitPrereleaseMode(cwd: string): Promise<ReleaseState> {
  const currentState = await ensureReleaseState(cwd);
  const nextState: ReleaseState = {
    schemaVersion: 1,
    mode: 'stable',
    migratedFromChangeset: currentState.migratedFromChangeset,
  };
  await writeReleaseState(cwd, nextState);
  return nextState;
}

export function createDefaultReleaseState(): ReleaseState {
  return {
    schemaVersion: 1,
    mode: 'stable',
  };
}

export async function getGitReleaseNotes(cwd: string): Promise<string[]> {
  try {
    const insideWorktree = await execa('git', ['rev-parse', '--is-inside-work-tree'], { cwd });
    if (insideWorktree.stdout !== 'true') {
      return [];
    }

    const latestTag = await execa('git', ['tag', '--sort=-creatordate'], { cwd });
    const latestTagName = latestTag.stdout
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean);
    const logArgs = latestTagName
      ? ['log', `${latestTagName}..HEAD`, '--pretty=format:%s']
      : ['log', '--pretty=format:%s'];
    const logResult = await execa('git', logArgs, { cwd });

    return logResult.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.startsWith('chore(release):'));
  } catch {
    return [];
  }
}

async function migrateLegacyChangesetState(cwd: string): Promise<ReleaseState | null> {
  const legacyDir = getLegacyChangesetDir(cwd);
  if (!(await fs.pathExists(legacyDir))) {
    return null;
  }

  const legacyPreStatePath = path.join(legacyDir, 'pre.json');
  const nextState: ReleaseState = (await fs.pathExists(legacyPreStatePath))
    ? {
        schemaVersion: 1,
        mode: 'pre',
        tag: ((await fs.readJSON(legacyPreStatePath)) as { tag?: string }).tag ?? 'beta',
        migratedFromChangeset: true,
      }
    : {
        schemaVersion: 1,
        mode: 'stable',
        migratedFromChangeset: true,
      };

  await writeReleaseState(cwd, nextState);
  await backupLegacyChangesetDir(cwd, legacyDir);
  return nextState;
}

async function backupLegacyChangesetDir(cwd: string, legacyDir: string) {
  const backupPath = path.join(cwd, '.dy-cli', 'legacy', 'changeset-backup');

  if (await fs.pathExists(backupPath)) {
    await fs.remove(backupPath);
  }

  await fs.ensureDir(path.dirname(backupPath));
  await fs.move(legacyDir, backupPath, { overwrite: true });
}
