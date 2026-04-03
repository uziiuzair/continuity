/**
 * Vault Scanner
 *
 * Recursively scans an Obsidian vault and extracts:
 * - File paths and directory structure
 * - Frontmatter metadata from each .md file
 * - First N lines of content as excerpts
 *
 * This builds a high-level index the AI can use for vault awareness
 * without loading all content into memory.
 */

import { walkVaultFiles, readVaultFile, listVaultDir } from "./file-ops";
import matter from "gray-matter";

const EXCERPT_LINES = 5;
const MAX_FILES = 500;

export interface VaultFileInfo {
  path: string;
  frontmatter: Record<string, unknown>;
  excerpt: string;
  sizeHint: "small" | "medium" | "large";
}

export interface VaultFolderInfo {
  path: string;
  fileCount: number;
  subfolders: string[];
}

export interface VaultScanResult {
  files: VaultFileInfo[];
  folders: VaultFolderInfo[];
  totalFiles: number;
  scannedAt: string;
}

/**
 * Scan the vault and build a structured index
 */
export async function scanVault(): Promise<VaultScanResult> {
  const allPaths = await walkVaultFiles("", 5);
  const scannedAt = new Date().toISOString();

  // Limit scan size for very large vaults
  const pathsToScan = allPaths.slice(0, MAX_FILES);

  // Scan each file for frontmatter and excerpt
  const files: VaultFileInfo[] = [];
  for (const filePath of pathsToScan) {
    try {
      const fileInfo = await scanFile(filePath);
      if (fileInfo) files.push(fileInfo);
    } catch {
      // Skip files that can't be read
      files.push({
        path: filePath,
        frontmatter: {},
        excerpt: "(unable to read)",
        sizeHint: "small",
      });
    }
  }

  // Build folder index
  const folders = buildFolderIndex(allPaths);

  return {
    files,
    folders,
    totalFiles: allPaths.length,
    scannedAt,
  };
}

/**
 * Scan a single file for frontmatter and excerpt
 */
async function scanFile(filePath: string): Promise<VaultFileInfo | null> {
  const content = await readVaultFile(filePath);

  // Parse frontmatter
  let frontmatter: Record<string, unknown> = {};
  let bodyContent = content;
  try {
    const parsed = matter(content);
    frontmatter = parsed.data as Record<string, unknown>;
    bodyContent = parsed.content;
  } catch {
    // If frontmatter parsing fails, use raw content
  }

  // Extract excerpt (first N non-empty lines of body)
  const lines = bodyContent.split("\n").filter((l) => l.trim());
  const excerpt = lines.slice(0, EXCERPT_LINES).join("\n");

  // Estimate size
  const charCount = content.length;
  const sizeHint: VaultFileInfo["sizeHint"] =
    charCount < 1000 ? "small" : charCount < 5000 ? "medium" : "large";

  return {
    path: filePath,
    frontmatter,
    excerpt,
    sizeHint,
  };
}

/**
 * Build folder structure from file paths
 */
function buildFolderIndex(filePaths: string[]): VaultFolderInfo[] {
  const folderMap = new Map<string, { files: number; subfolders: Set<string> }>();

  for (const filePath of filePaths) {
    const parts = filePath.split("/");
    if (parts.length <= 1) continue; // Root-level file

    // Register each parent folder
    for (let i = 1; i < parts.length; i++) {
      const folderPath = parts.slice(0, i).join("/");
      if (!folderMap.has(folderPath)) {
        folderMap.set(folderPath, { files: 0, subfolders: new Set() });
      }

      // Count direct children (files in this folder)
      if (i === parts.length - 1) {
        folderMap.get(folderPath)!.files++;
      }

      // Register immediate subfolders
      if (i < parts.length - 1) {
        const subfolder = parts[i];
        folderMap.get(folderPath)!.subfolders.add(subfolder);
      }
    }
  }

  // Also add root-level stats
  const rootFiles = filePaths.filter((p) => !p.includes("/")).length;
  const rootSubfolders = new Set<string>();
  for (const p of filePaths) {
    const firstSlash = p.indexOf("/");
    if (firstSlash !== -1) {
      rootSubfolders.add(p.substring(0, firstSlash));
    }
  }

  const folders: VaultFolderInfo[] = [
    {
      path: "/",
      fileCount: rootFiles,
      subfolders: Array.from(rootSubfolders),
    },
  ];

  for (const [path, info] of folderMap.entries()) {
    folders.push({
      path,
      fileCount: info.files,
      subfolders: Array.from(info.subfolders),
    });
  }

  return folders;
}

/**
 * Rescan specific files (for incremental updates after writes)
 */
export async function rescanFiles(
  filePaths: string[]
): Promise<VaultFileInfo[]> {
  const results: VaultFileInfo[] = [];
  for (const path of filePaths) {
    try {
      const info = await scanFile(path);
      if (info) results.push(info);
    } catch {
      // Skip files that can't be read
    }
  }
  return results;
}
