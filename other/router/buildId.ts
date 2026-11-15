/**
 * Identifies one build. Songbook sources are fetched at build time, so the git
 * commit alone can stay the same while the data changes; `builtTime` tells
 * builds apart.
 */
export function getBuildId(): string {
  return `${__BUILD_INFO__.commit}@${__BUILD_INFO__.builtTime}`;
}
