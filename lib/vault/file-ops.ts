/**
 * Vault File Operations
 *
 * Thin wrapper around Tauri FS plugin for vault read/write operations.
 * All paths are relative to the vault root — the vault path is resolved here.
 */

import {
  readDir,
  readTextFile,
  writeTextFile,
  mkdir,
  exists,
  DirEntry,
} from "@tauri-apps/plugin-fs";
import { getVaultConfig } from "./config";

async function getVaultPath(): Promise<string> {
  const config = await getVaultConfig();
  if (!config?.path) {
    throw new Error("Obsidian vault not connected");
  }
  return config.path;
}

/**
 * Join path segments, normalizing separators
 */
function joinPath(...parts: string[]): string {
  return parts
    .filter(Boolean)
    .join("/")
    .replace(/\/+/g, "/");
}

/**
 * Resolve a relative path within the vault to an absolute path
 */
export async function resolveVaultPath(relativePath: string): Promise<string> {
  const vaultPath = await getVaultPath();
  return joinPath(vaultPath, relativePath);
}

/**
 * Check if a file or directory exists in the vault
 */
export async function vaultExists(relativePath: string): Promise<boolean> {
  const fullPath = await resolveVaultPath(relativePath);
  return exists(fullPath);
}

/**
 * Read a text file from the vault
 */
export async function readVaultFile(relativePath: string): Promise<string> {
  const fullPath = await resolveVaultPath(relativePath);
  return readTextFile(fullPath);
}

/**
 * Write a text file to the vault, creating parent directories as needed
 */
export async function writeVaultFile(
  relativePath: string,
  content: string
): Promise<void> {
  const fullPath = await resolveVaultPath(relativePath);

  // Ensure parent directory exists
  const parts = relativePath.split("/");
  if (parts.length > 1) {
    const parentRelative = parts.slice(0, -1).join("/");
    const parentPath = await resolveVaultPath(parentRelative);
    const parentExists = await exists(parentPath);
    if (!parentExists) {
      await mkdir(parentPath, { recursive: true });
    }
  }

  await writeTextFile(fullPath, content);
}

/**
 * List contents of a directory in the vault
 */
export async function listVaultDir(
  relativePath: string = ""
): Promise<DirEntry[]> {
  const fullPath = relativePath
    ? await resolveVaultPath(relativePath)
    : await getVaultPath();
  return readDir(fullPath);
}

/**
 * Recursively walk the vault and return all .md file paths (relative to vault root)
 */
export async function walkVaultFiles(
  relativePath: string = "",
  maxDepth: number = 5
): Promise<string[]> {
  if (maxDepth <= 0) return [];

  const files: string[] = [];
  const entries = await listVaultDir(relativePath);

  for (const entry of entries) {
    const entryPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    // Skip hidden files/dirs and .obsidian config
    if (entry.name.startsWith(".")) continue;
    if (entry.name === "node_modules") continue;

    if (entry.isDirectory) {
      const subFiles = await walkVaultFiles(entryPath, maxDepth - 1);
      files.push(...subFiles);
    } else if (entry.name.endsWith(".md")) {
      files.push(entryPath);
    }
  }

  return files;
}

/**
 * Check if the vault root path exists and looks like an Obsidian vault
 */
export async function validateVaultPath(path: string): Promise<boolean> {
  try {
    const pathExists = await exists(path);
    if (!pathExists) return false;

    // Check for .obsidian directory (strong indicator)
    const obsidianDir = joinPath(path, ".obsidian");
    const hasObsidian = await exists(obsidianDir);

    // Even without .obsidian, a directory with .md files works
    if (hasObsidian) return true;

    // Fallback: check if it's a directory with some files
    const entries = await readDir(path);
    return entries.length > 0;
  } catch {
    return false;
  }
}
