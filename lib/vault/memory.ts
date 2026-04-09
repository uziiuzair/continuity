/**
 * Vault Memory Builder
 *
 * Converts vault scan results into a structured memory entry
 * that gives the AI high-level awareness of vault contents.
 * Stored in the memories table under a special key.
 */

import { setMemory, getMemory } from "@/lib/db/memories";
import { setVaultLastScan } from "./config";
import type { VaultScanResult, VaultFileInfo, VaultFolderInfo } from "./scanner";

const VAULT_MEMORY_KEY = "obsidian_vault_index";
const VAULT_MEMORY_SCOPE = "global";
const MAX_KEY_FILES = 30;

export interface VaultMemory {
  vaultPath: string;
  lastScanned: string;
  totalFiles: number;
  structure: string;
  keyFiles: string;
}

/**
 * Build and store vault memory from scan results
 */
export async function buildVaultMemory(
  vaultPath: string,
  scanResult: VaultScanResult
): Promise<void> {
  const memory = formatVaultMemory(vaultPath, scanResult);
  await setMemory(VAULT_MEMORY_KEY, memory, VAULT_MEMORY_SCOPE);
  await setVaultLastScan(scanResult.scannedAt);
}

/**
 * Get the current vault memory
 */
export async function getVaultMemory(): Promise<string | null> {
  const mem = await getMemory(VAULT_MEMORY_KEY, VAULT_MEMORY_SCOPE);
  return mem?.content ?? null;
}

/**
 * Format scan results into a concise memory string
 */
function formatVaultMemory(
  vaultPath: string,
  scan: VaultScanResult
): string {
  const lines: string[] = [];

  lines.push(`Obsidian Vault: ${vaultPath}`);
  lines.push(`Last scanned: ${scan.scannedAt}`);
  lines.push(`Total files: ${scan.totalFiles}`);
  lines.push("");

  // Structure overview (top-level folders)
  const rootFolder = scan.folders.find((f) => f.path === "/");
  if (rootFolder && rootFolder.subfolders.length > 0) {
    lines.push("Structure:");
    for (const subfolder of rootFolder.subfolders.slice(0, 15)) {
      const folderInfo = scan.folders.find((f) => f.path === subfolder);
      const fileCount = folderInfo?.fileCount ?? 0;
      const subCount = folderInfo?.subfolders.length ?? 0;
      const details: string[] = [];
      if (fileCount > 0) details.push(`${fileCount} files`);
      if (subCount > 0) details.push(`${subCount} subfolders`);
      lines.push(`  ${subfolder}/ (${details.join(", ") || "empty"})`);
    }
    if (rootFolder.subfolders.length > 15) {
      lines.push(`  ... and ${rootFolder.subfolders.length - 15} more folders`);
    }
    lines.push("");
  }

  // Key files — prioritize files with frontmatter, recent content, or important-sounding names
  const keyFiles = selectKeyFiles(scan.files);
  if (keyFiles.length > 0) {
    lines.push("Key files:");
    for (const file of keyFiles) {
      const meta: string[] = [];
      if (file.frontmatter.type) meta.push(`type: ${file.frontmatter.type}`);
      if (file.frontmatter.status) meta.push(`status: ${file.frontmatter.status}`);
      if (file.frontmatter.tags) {
        const tags = Array.isArray(file.frontmatter.tags)
          ? file.frontmatter.tags.join(", ")
          : String(file.frontmatter.tags);
        meta.push(`tags: ${tags}`);
      }

      const metaStr = meta.length > 0 ? ` (${meta.join(", ")})` : "";
      const excerptOneLiner = file.excerpt
        .split("\n")[0]
        .replace(/^#+\s*/, "")
        .trim()
        .slice(0, 60);
      const excerptStr = excerptOneLiner ? ` — ${excerptOneLiner}` : "";

      lines.push(`  - ${file.path}${metaStr}${excerptStr}`);
    }
  }

  return lines.join("\n");
}

/**
 * Select the most important/representative files for the memory index
 */
function selectKeyFiles(files: VaultFileInfo[]): VaultFileInfo[] {
  // Score files by importance
  const scored = files.map((file) => {
    let score = 0;

    // Files with frontmatter are more structured/important
    if (Object.keys(file.frontmatter).length > 0) score += 3;

    // Files in root or first-level folders are often important
    const depth = file.path.split("/").length;
    if (depth <= 2) score += 2;

    // Important-sounding names
    const name = file.path.toLowerCase();
    if (name.includes("readme") || name.includes("index")) score += 3;
    if (name.includes("todo") || name.includes("task")) score += 2;
    if (name.includes("goal") || name.includes("plan")) score += 2;
    if (name.includes("budget") || name.includes("finance")) score += 2;
    if (name.includes("project") || name.includes("overview")) score += 2;
    if (name.includes("journal") || name.includes("daily")) score += 1;

    // Larger files tend to have more content
    if (file.sizeHint === "large") score += 1;
    if (file.sizeHint === "medium") score += 0.5;

    return { file, score };
  });

  // Sort by score descending, take top N
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_KEY_FILES).map((s) => s.file);
}

/**
 * Update vault memory with new/changed files after a write
 */
export async function updateVaultMemoryFile(
  updatedFile: VaultFileInfo
): Promise<void> {
  const currentMemory = await getVaultMemory();
  if (!currentMemory) return;

  // Simple approach: add a note about the updated file at the end
  const updatedLine = `  - ${updatedFile.path} (updated: ${new Date().toISOString()})`;

  // Check if this file is already in the key files section
  if (currentMemory.includes(updatedFile.path)) {
    // Replace the existing line
    const lines = currentMemory.split("\n");
    const updatedLines = lines.map((line) =>
      line.includes(updatedFile.path) ? updatedLine : line
    );
    await setMemory(VAULT_MEMORY_KEY, updatedLines.join("\n"), VAULT_MEMORY_SCOPE);
  } else {
    // Append to key files
    const updatedMemory = currentMemory + "\n" + updatedLine;
    await setMemory(VAULT_MEMORY_KEY, updatedMemory, VAULT_MEMORY_SCOPE);
  }
}
