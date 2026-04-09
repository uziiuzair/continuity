"use client";

/**
 * PluginPanel — Full-page plugin view for sidebar navigation.
 *
 * Shown when a user clicks a plugin's sidebar icon.
 * Wraps PluginFrame with a header showing the plugin name.
 */

import { usePlugins } from "@/providers/plugin-provider";
import PluginFrame from "./PluginFrame";

interface PluginPanelProps {
  pluginId: string;
}

export default function PluginPanel({ pluginId }: PluginPanelProps) {
  const { plugins, panels } = usePlugins();

  const plugin = plugins.find((p) => p.id === pluginId);
  const panel = panels.find(
    (p) => p.pluginId === pluginId && p.slot === "sidebar"
  );

  if (!plugin) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--mantine-color-dimmed)",
        }}
      >
        Plugin not found
      </div>
    );
  }

  if (!panel) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--mantine-color-dimmed)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 14, fontWeight: 500 }}>{plugin.name}</p>
          <p style={{ fontSize: 12, opacity: 0.7 }}>
            This plugin has no sidebar panel
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--mantine-color-default-border)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 500 }}>{panel.label}</span>
        <span
          style={{
            fontSize: 11,
            opacity: 0.5,
            marginLeft: "auto",
          }}
        >
          {plugin.name} v{plugin.version}
        </span>
      </div>
      <PluginFrame
        url={panel.url}
        pluginId={pluginId}
        title={panel.label}
        style={{ flex: 1 }}
      />
    </div>
  );
}
