import { build } from "esbuild";
import { cpSync, mkdirSync, existsSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "dist");

if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true });
}
mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: [join(__dirname, "src/index.ts")],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "esm",
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  outfile: join(outDir, "plugin-host.mjs"),
  external: ["better-sqlite3"],
  minify: false,
  sourcemap: false,
});

const nodeModulesDir = join(outDir, "node_modules");
mkdirSync(nodeModulesDir, { recursive: true });

console.log("Plugin Host bundled → dist/plugin-host.mjs");

if (process.argv.includes("--with-native")) {
  const nativeModules = [
    "better-sqlite3",
    "bindings",
    "file-uri-to-path",
    "prebuild-install",
    "node-addon-api",
  ];

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
