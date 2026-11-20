/**
 * Shared helpers for running Eve on this machine.
 * Production: the hosting platform on the M6 Mac, project `netbench-eve`, https://netbench-eve.cristiancode.dev.
 * Models: Bionic (:1235) first, then Ollama (:11434), both on loopback. See agent/lib/model.ts.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const here = dirname(fileURLToPath(import.meta.url));
export const repo = resolve(here, '../..');

export function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

export function loadEveEnv() {
  loadEnv(resolve(repo, '.env'));
  loadEnv(resolve(here, '.env'));
  loadEnv(resolve(here, '.env.local'));
  if (!process.env.NETBENCH_API_URL) {
    process.env.NETBENCH_API_URL = 'http://127.0.0.1:3001';
  }
}

/** Which local model engines answer. Eve still starts without them; its first step then fails over or errors. */
export async function checkEngines() {
  const engines = [
    ['Bionic', (process.env.EVE_BIONIC_URL || 'http://127.0.0.1:1235/v1') + '/models'],
    ['Ollama', (process.env.EVE_OLLAMA_URL || 'http://127.0.0.1:11434/v1') + '/models'],
  ];
  for (const [name, url] of engines) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
      console.log(`[eve] ${name}: ${r.ok ? 'up' : `HTTP ${r.status}`} (${url})`);
    } catch {
      console.warn(`[eve] ${name}: not answering at ${url}`);
    }
  }
}

export function run(command, args) {
  return new Promise((resolveExit) => {
    const child = spawn(command, args, { cwd: here, env: process.env, stdio: 'inherit', shell: true });
    child.on('exit', (code, signal) => {
      resolveExit(signal ? 1 : (code ?? 1));
    });
  });
}
