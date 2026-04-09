/**
 * Plugin Manifest Validation
 *
 * Parses and validates continuity-plugin.json files.
 * Used by both the Plugin Host (Node.js) and the frontend (via dynamic import).
 */

import type { PluginManifest, PluginCapability, PluginRuntime, PluginSettingType } from "@/types/plugin";

const VALID_CAPABILITIES: PluginCapability[] = [
  "db:read", "db:write", "db:subscribe",
  "events:memories", "events:threads", "events:chat", "events:mcp", "events:app",
  "mcp:read", "mcp:control",
  "chat:tools", "chat:prompts",
  "ui:sidebar", "ui:settings", "ui:statusbar", "ui:notifications",
];

const VALID_RUNTIMES: PluginRuntime[] = ["node", "python", "deno"];

const VALID_SETTING_TYPES: PluginSettingType[] = [
  "string", "number", "boolean", "secret", "select",
];

interface ValidationError {
  field: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  manifest?: PluginManifest;
  errors: ValidationError[];
}

/**
 * Validate a parsed JSON object as a PluginManifest.
 * No external dependencies — pure TypeScript validation.
 */
export function validateManifest(raw: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { valid: false, errors: [{ field: "root", message: "Manifest must be a JSON object" }] };
  }

  const obj = raw as Record<string, unknown>;

  // Required string fields
  const requiredStrings = ["id", "name", "version", "description", "author", "entry"] as const;
  for (const field of requiredStrings) {
    if (typeof obj[field] !== "string" || (obj[field] as string).trim() === "") {
      errors.push({ field, message: `"${field}" is required and must be a non-empty string` });
    }
  }

  // ID format: lowercase alphanumeric with hyphens
  if (typeof obj.id === "string" && !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(obj.id)) {
    errors.push({ field: "id", message: "\"id\" must be lowercase alphanumeric with hyphens (e.g., 'org-memory-sync')" });
  }

  // Version: semver-ish
  if (typeof obj.version === "string" && !/^\d+\.\d+\.\d+/.test(obj.version)) {
    errors.push({ field: "version", message: "\"version\" must be semver format (e.g., '1.0.0')" });
  }

  // Runtime
  if (!VALID_RUNTIMES.includes(obj.runtime as PluginRuntime)) {
    errors.push({ field: "runtime", message: `"runtime" must be one of: ${VALID_RUNTIMES.join(", ")}` });
  }

  // Capabilities
  if (!Array.isArray(obj.capabilities)) {
    errors.push({ field: "capabilities", message: "\"capabilities\" must be an array" });
  } else {
    for (const cap of obj.capabilities) {
      if (!VALID_CAPABILITIES.includes(cap as PluginCapability)) {
        errors.push({ field: "capabilities", message: `Unknown capability: "${cap}". Valid: ${VALID_CAPABILITIES.join(", ")}` });
      }
    }
  }

  // Optional string fields
  const optionalStrings = ["homepage", "license", "icon"] as const;
  for (const field of optionalStrings) {
    if (obj[field] !== undefined && typeof obj[field] !== "string") {
      errors.push({ field, message: `"${field}" must be a string if provided` });
    }
  }

  // Settings (optional array)
  if (obj.settings !== undefined) {
    if (!Array.isArray(obj.settings)) {
      errors.push({ field: "settings", message: "\"settings\" must be an array if provided" });
    } else {
      for (let i = 0; i < obj.settings.length; i++) {
        const setting = obj.settings[i] as Record<string, unknown>;
        if (!setting || typeof setting !== "object") {
          errors.push({ field: `settings[${i}]`, message: "Each setting must be an object" });
          continue;
        }
        if (typeof setting.key !== "string" || setting.key.trim() === "") {
          errors.push({ field: `settings[${i}].key`, message: "Setting key is required" });
        }
        if (!VALID_SETTING_TYPES.includes(setting.type as PluginSettingType)) {
          errors.push({ field: `settings[${i}].type`, message: `Setting type must be one of: ${VALID_SETTING_TYPES.join(", ")}` });
        }
        if (typeof setting.label !== "string" || setting.label.trim() === "") {
          errors.push({ field: `settings[${i}].label`, message: "Setting label is required" });
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const manifest: PluginManifest = {
    id: obj.id as string,
    name: obj.name as string,
    version: obj.version as string,
    description: obj.description as string,
    author: obj.author as string,
    homepage: obj.homepage as string | undefined,
    license: obj.license as string | undefined,
    icon: obj.icon as string | undefined,
    runtime: obj.runtime as PluginRuntime,
    entry: obj.entry as string,
    capabilities: obj.capabilities as PluginCapability[],
    settings: obj.settings as PluginManifest["settings"],
  };

  return { valid: true, manifest, errors: [] };
}

/**
 * Check if a manifest declares a specific capability.
 */
export function hasCapability(manifest: PluginManifest, capability: PluginCapability): boolean {
  return manifest.capabilities.includes(capability);
}

/**
 * Get the spawn command for a plugin based on its runtime.
 */
export function getSpawnCommand(manifest: PluginManifest): { command: string; args: string[] } {
  switch (manifest.runtime) {
    case "node":
      return { command: "node", args: [manifest.entry] };
    case "python":
      return { command: "python3", args: [manifest.entry] };
    case "deno":
      return { command: "deno", args: ["run", "--allow-net", "--allow-env", manifest.entry] };
  }
}
