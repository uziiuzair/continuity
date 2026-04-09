import { build } from "esbuild";
import { cpSync, mkdirSync, existsSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "dist");

// Clean previous build
if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true });
}
mkdirSync(outDir, { recursive: true });

// Bundle all TypeScript into a single ESM file.
// better-sqlite3 stays external — npm installs the correct native binary per-platform.
await build({
  entryPoints: [join(__dirname, "index.ts")],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "esm",
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  outfile: join(outDir, "server.mjs"),
  external: ["better-sqlite3"],
  minify: false,
  sourcemap: false,
});

// Always create node_modules dir so Tauri resource config doesn't fail in dev mode
const nodeModulesDir = join(outDir, "node_modules");
mkdirSync(nodeModulesDir, { recursive: true });

console.log("Server bundled → dist/server.mjs");

// For Tauri app bundle: also copy native deps so the app resource is self-contained.
// When published to npm, these are installed by npm automatically.
if (process.argv.includes("--with-native")) {
  const nativeModules = [
    "better-sqlite3",
    "bindings",
    "file-uri-to-path",
    "prebuild-install",
    "node-addon-api",
  ];
  const nodeModulesDir = join(outDir, "node_modules");
  mkdirSync(nodeModulesDir, { recursive: true });

  for (const mod of nativeModules) {
    const src = join(__dirname, "node_modules", mod);
    const dest = join(nodeModulesDir, mod);
    if (existsSync(src)) {
      cpSync(src, dest, { recursive: true });
      console.log(`  Copied ${mod}`);
    }
  }
  console.log("Native modules bundled for Tauri resource");
}
