import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';
import { defineDynamic } from 'eve';
import { Agent, fetch as undiciFetch } from 'undici';
import { modelState, processHint } from './model-state.ts';

/**
 * Model selection for Eve and her subagents: local models only, on the Mac that runs Eve.
 *
 * The chain is Bionic first (LM Studio's app, OpenAI-compatible on :1235), then Ollama (:11434/v1). Nothing goes to a
 * cloud provider. When a step fails (engine not running, model unloaded, malformed tool call…) the hook in
 * lib/model-fallback-hook.ts advances the durable per-session index and the resolver below picks the next model for
 * the retried step. The primary is tried again after EVE_MODEL_RECOVER_MS.
 *
 * Entries are `<engine>/<model id>`; the engine decides the base URL:
 *   bionic → EVE_BIONIC_URL (default http://127.0.0.1:1235/v1)
 *   ollama → EVE_OLLAMA_URL (default http://127.0.0.1:11434/v1)
 *
 * Overrides: EVE_MODEL (primary), EVE_FALLBACK_MODELS (comma list), EVE_CONTEXT_TOKENS (cap),
 * EVE_MODEL_RECOVER_MINUTES, EVE_MODEL_TIMEOUT_MS.
 */

/** Bionic keeps this model loaded all the time (Mac mini Monitor's keep-loaded list), with a 65,536-token context. */
const DEFAULT_MODEL = 'bionic/qwen3.8-9b-heretic-uncensored-mtplx';

/**
 * `netbench-eve` is `qwen3.5:9b-mlx` with `num_ctx 32768` (apps/eve-agent/ollama/Modelfile). Ollama's OpenAI endpoint
 * ignores a per-request context size and serves 8,192 tokens by default, less than Eve's first prompt (about 9,300).
 */
const DEFAULT_FALLBACKS = ['ollama/netbench-eve'];

/** Context windows (tokens) as each engine serves them. Unknown ids fall back to EVE_CONTEXT_TOKENS. */
const CONTEXT_WINDOW: Record<string, number> = {
  'bionic/qwen3.8-9b-heretic-uncensored-mtplx': 65_536,
  'ollama/netbench-eve': 32_768,
  'ollama/qwen3.5:9b-mlx': 8_192,
};

const ENGINES = {
  bionic: process.env.EVE_BIONIC_URL?.trim() || 'http://127.0.0.1:1235/v1',
  ollama: process.env.EVE_OLLAMA_URL?.trim() || 'http://127.0.0.1:11434/v1',
} as const;

type Engine = keyof typeof ENGINES;

/**
 * Each engine answers one request at a time, so a step can wait minutes for its first byte while another visitor's
 * turn runs. Node's fetch gives up after 5 minutes without headers (UND_ERR_HEADERS_TIMEOUT); this one waits
 * EVE_MODEL_TIMEOUT_MS (default 15 minutes). A refused connection still fails within 5 seconds, so a stopped engine
 * fails over to the next one quickly.
 */
const MODEL_TIMEOUT_MS = Math.max(60_000, Number(process.env.EVE_MODEL_TIMEOUT_MS) || 15 * 60_000);
const dispatcher = new Agent({ headersTimeout: MODEL_TIMEOUT_MS, bodyTimeout: MODEL_TIMEOUT_MS, connectTimeout: 5_000 });
const localFetch = ((input: Parameters<typeof undiciFetch>[0], init?: Parameters<typeof undiciFetch>[1]) =>
  undiciFetch(input, { ...init, dispatcher })) as unknown as typeof fetch;

const list = (raw: string | undefined) =>
  (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const EVE_MODEL = process.env.EVE_MODEL?.trim() || DEFAULT_MODEL;

const fallbacks = process.env.EVE_FALLBACK_MODELS === undefined ? DEFAULT_FALLBACKS : list(process.env.EVE_FALLBACK_MODELS);

/** Primary first, then fallbacks, no duplicates. Never empty. */
export const MODEL_CHAIN: readonly string[] = [...new Set([EVE_MODEL, ...fallbacks])];

/** Upper bound for the context window Eve assumes (compaction starts at 80 % of it). */
export const EVE_CONTEXT_TOKENS = Math.max(16_000, Number(process.env.EVE_CONTEXT_TOKENS) || 65_536);

/** After this long on a fallback model, the session tries the primary again. */
export const EVE_MODEL_RECOVER_MS = Math.max(1, Number(process.env.EVE_MODEL_RECOVER_MINUTES) || 15) * 60_000;

export const contextWindowFor = (model: string): number => Math.min(CONTEXT_WINDOW[model] ?? EVE_CONTEXT_TOKENS, EVE_CONTEXT_TOKENS);

export const clampIndex = (i: number): number => (Number.isFinite(i) && i > 0 ? Math.min(Math.trunc(i), MODEL_CHAIN.length - 1) : 0);

/** `bionic/qwen…` → engine and model id. A bare id (no known engine prefix) goes to Ollama. */
export function parseModel(entry: string): { engine: Engine; modelId: string } {
  const slash = entry.indexOf('/');
  const head = slash > 0 ? entry.slice(0, slash) : '';
  if (head === 'bionic' || head === 'ollama') return { engine: head, modelId: entry.slice(slash + 1) };
  return { engine: 'ollama', modelId: entry };
}

const providers = new Map<Engine, ReturnType<typeof createOpenAICompatible>>();

function provider(engine: Engine) {
  let p = providers.get(engine);
  if (!p) {
    // Both engines listen on loopback only and need no key. includeUsage asks for token counts in the stream.
    p = createOpenAICompatible({ name: engine, baseURL: ENGINES[engine], includeUsage: true, fetch: localFetch });
    providers.set(engine, p);
  }
  return p;
}

/**
 * The AI SDK model for a chain entry. The provider package ships its own copy of the provider types, newer than the
 * one eve and `ai` were built with; the object is the same at runtime, so it is typed as `ai`'s model.
 */
export function languageModel(entry: string): Exclude<LanguageModel, string> {
  const { engine, modelId } = parseModel(entry);
  return provider(engine).chatModel(modelId) as unknown as Exclude<LanguageModel, string>;
}

/**
 * Which chain entry a `step.started` model id belongs to. eve reports a direct model as its bare id or prefixed with
 * the provider name, so both forms match.
 */
export function chainIndexOf(modelId: string): number {
  const exact = MODEL_CHAIN.indexOf(modelId);
  if (exact !== -1) return exact;
  return MODEL_CHAIN.findIndex((entry) => {
    const { engine, modelId: id } = parseModel(entry);
    return modelId === id || modelId === `${engine}.chat/${id}` || modelId.endsWith(`/${id}`) || modelId.endsWith(`:${id}`);
  });
}

export interface ModelSelection {
  model: Exclude<LanguageModel, string>;
  modelContextWindowTokens: number;
}

/** Selection for chain position `index`. */
export function modelSelection(index: number): ModelSelection {
  const entry = MODEL_CHAIN[clampIndex(index)]!;
  return { model: languageModel(entry), modelContextWindowTokens: contextWindowFor(entry) };
}

const hintFresh = () => processHint.at > 0 && Date.now() - processHint.at < EVE_MODEL_RECOVER_MS;

/** Chain position for the current session: durable state, else the process-wide hint, else the primary. */
export function currentIndex(): number {
  let s: ReturnType<typeof modelState.get> | undefined;
  try {
    s = modelState.get();
  } catch {
    // Outside an eve session context (e.g. compile-time evaluation): no durable state to read.
  }
  if (s && s.failures > 0) {
    if (s.index > 0 && Date.now() - s.lastFailureAt >= EVE_MODEL_RECOVER_MS) return 0;
    return clampIndex(s.index);
  }
  return hintFresh() ? clampIndex(processHint.index) : 0;
}

/**
 * Dynamic model, resolved for every step so a mid-turn failure switches model for the retried step. Only
 * `step.started`: eve stores session and turn selections and accepts only model id strings there, while a direct
 * provider model is a live object.
 */
export const dynamicModel = defineDynamic({
  events: {
    'step.started': () => modelSelection(currentIndex()),
  },
});

/** Shared agent config: dynamic model, earlier compaction than eve's 0.9 default, no per-session token ceiling. */
export const modelConfig = {
  model: dynamicModel,
  compaction: { thresholdPercent: 0.8 },
  limits: { maxInputTokensPerSession: false as const, maxOutputTokensPerSession: false as const },
} as const;
