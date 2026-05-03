export type ReleaseStateMode = 'stable' | 'pre';

export interface ReleaseState {
  schemaVersion: 1;
  mode: ReleaseStateMode;
  tag?: string;
  migratedFromChangeset?: boolean;
}
