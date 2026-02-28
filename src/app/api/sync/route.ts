import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllPlugins } from "@/plugins/registry";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const plugins = getAllPlugins();
  const results: Record<string, { newEvents: number; message?: string; error?: string }> = {};

  // Fetch user's timezone
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const timezone = user?.timezone || 'UTC';

  // Fetch user's plugin connections
  const connections = await prisma.pluginConnection.findMany({
    where: { userId, enabled: true },
  });

  for (const plugin of plugins) {
    const connection = connections.find(c => c.pluginId === plugin.id);

    // GitHub always runs (uses User.accessToken directly)
    // Other plugins need a PluginConnection
    if (plugin.id === 'github' || connection) {
      try {
        const result = await plugin.sync(userId, {
          credentials: (connection?.credentials as Record<string, any>) ?? null,
          settings: (connection?.settings as Record<string, any>) ?? null,
          lastSynced: connection?.lastSynced ?? null,
          timezone,
        });
        results[plugin.id] = result;

        // Update lastSynced (and credentials if refreshed) for connected plugins
        if (connection) {
          await prisma.pluginConnection.update({
            where: { id: connection.id },
            data: {
              lastSynced: new Date(),
              ...(result.updatedCredentials && { credentials: result.updatedCredentials }),
            },
          });
        }
      } catch (error: any) {
        console.error(`Sync error for ${plugin.id}:`, error);
        results[plugin.id] = { newEvents: 0, error: error.message };
      }
    }
  }

  // Invalidate cached activity data for this user
  revalidateTag(`activity-${userId}`, "default");

  return NextResponse.json({ results });
}
