import type { PluginDefinition } from './types';
import { githubPlugin } from './github';
import { spotifyPlugin } from './spotify';

const plugins: PluginDefinition[] = [
  githubPlugin,
  spotifyPlugin,
];

export function getPlugin(id: string): PluginDefinition | undefined {
  return plugins.find(p => p.id === id);
}

export function getAllPlugins(): PluginDefinition[] {
  return plugins;
}
