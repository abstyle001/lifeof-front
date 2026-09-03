import { readFile, writeFile } from "node:fs/promises";

const publicKey = process.env.TAURI_UPDATER_PUBLIC_KEY?.trim();
if (!publicKey) throw new Error("TAURI_UPDATER_PUBLIC_KEY is required for release builds");

const configUrl = new URL("../src-tauri/tauri.conf.json", import.meta.url);
const config = JSON.parse(await readFile(configUrl, "utf8"));
config.plugins ??= {};
config.plugins.updater ??= {};
config.plugins.updater.pubkey = publicKey;
await writeFile(configUrl, JSON.stringify(config, null, 2) + "\n");
