import type { ReactNode } from 'react';

export interface PluginDefinition {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
  color: string;

  sync: (userId: string, connection: PluginConnectionData) => Promise<SyncResult>;
  getActivitySummary: (events: ActivityEventData[]) => PluginDaySummary;
  getActivityWeight: (events: ActivityEventData[]) => number;
  DayDetailCard: React.ComponentType<{ events: ActivityEventData[]; date: string }>;
}

export interface PluginConnectionData {
  credentials: Record<string, any> | null;
  settings: Record<string, any> | null;
  lastSynced: Date | null;
}

export interface SyncResult {
  newEvents: number;
  message?: string;
  updatedCredentials?: Record<string, any>;
}

export interface ActivityEventData {
  id: string;
  pluginId: string;
  day: string;
  timestamp: string;
  type: string;
  title: string;
  subtitle: string | null;
  metadata: Record<string, any> | null;
  value: number | null;
}

export interface PluginDaySummary {
  pluginId: string;
  label: string;
  count: number;
  color: string;
}
