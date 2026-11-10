import type { TPlayerSourcePlugin } from '@/types/player';

const plugins = new Map<string, TPlayerSourcePlugin>();
const FALLBACK_TYPE = 'audio';

/**/
export function registerPlugin(plugin: TPlayerSourcePlugin): void {
  plugins.set(plugin.type, plugin);
}

/**/
export function getPlugin(type: string): TPlayerSourcePlugin {
  const plugin = plugins.get(type);
  if (!plugin) throw new Error(`Player: no plugin registered for type "${type}"`);
  return plugin;
}

/** Later registrations win, so custom plugins can override built-in matching. */
export function detectType(url: string): string {
  const list = [...plugins.values()].reverse();
  return list.find((p) => p.match(url))?.type ?? FALLBACK_TYPE;
}
