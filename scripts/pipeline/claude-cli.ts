import path from "node:path";
import { run } from "./exec.ts";

/**
 * Vision calls go through the Claude Code CLI rather than the API, so the tool runs on
 * the existing subscription with no API key.
 *
 * The CLI is an agent, and an agent session is expensive: its default system prompt, the
 * schemas of every built-in tool and the user's CLAUDE.md add up to ~26 000 input tokens
 * before the model has looked at a single frame, and the pipeline pays that on every call.
 * So each call is stripped down to a plain vision request — no tools, no settings files,
 * no MCP servers, and our own system prompt in place of the agent one. Measured on a batch
 * of three frames: 55 590 input tokens over 4 turns before, 2 927 over 1 turn after.
 */
export interface AskOptions {
  /** Where the CLI runs when no images are attached; otherwise the image folder wins. */
  cwd: string;
  /** Replaces the agent system prompt. Keep it identical across calls so it caches. */
  system: string;
  /** Absolute paths to images, inlined into the prompt as attachments. */
  images?: string[];
  model?: string;
  /** Overrides GUITARRERO_EFFORT for this call. */
  effort?: string;
  /**
   * How the images reach the model. "mention" inlines them (cheap, one turn). "read" hands
   * the model the paths and lets it call Read — the way the first tabs were made, before
   * mentions; kept because string accuracy differed between the two and it had to be measured.
   */
  attach?: "mention" | "read";
  timeoutMs?: number;
}

/**
 * How long the model deliberates before answering. This turned out to dominate the bill once
 * the input was fixed: at the CLI default one batch of three frames produced 39 400 output
 * tokens — the JSON was ~1 500 of them and the rest was thinking — and took eight minutes.
 */
const DEFAULT_EFFORT = process.env.GUITARRERO_EFFORT ?? "medium";

/** Transcription accuracy is the whole point here, so the stronger model is the default. */
const DEFAULT_MODEL = process.env.GUITARRERO_MODEL ?? "opus";

/**
 * Turns image paths into `@name` mentions, which make the CLI attach the files to the user
 * message directly. Letting the model call Read instead costs one extra turn per image, and
 * every turn re-sends the images already in context — the first image of a three-frame batch
 * got billed three times.
 *
 * A mention cannot contain whitespace: the CLI silently drops the attachment and the model
 * then answers from nothing at all. So the mentions are basenames and the CLI is run from
 * the folder holding them, which keeps working under a path like `/My Repos/Guitarrero`.
 */
function attach(images: string[]): { dir: string | null; mentions: string } {
  if (images.length === 0) return { dir: null, mentions: "" };

  const dir = path.dirname(images[0]);
  const names = images.map((image) => {
    if (path.dirname(image) !== dir) {
      throw new Error(`images of one call must share a folder: ${image} is not in ${dir}`);
    }
    const name = path.basename(image);
    if (/\s/.test(name)) throw new Error(`image name cannot contain whitespace: ${name}`);
    return `@${name}`;
  });

  return { dir, mentions: names.join(" ") };
}

export async function askClaude(prompt: string, options: AskOptions): Promise<string> {
  // For re-assembling from cache and regression runs: a call that would spend is a bug.
  if (process.env.GUITARRERO_OFFLINE === "1") {
    throw new Error("GUITARRERO_OFFLINE=1: this run must not call the model");
  }
  // Read is the default: on the same pages, same model and effort, `@` mentions put only
  // 62-71% of notes on the right string and Read 95% (2026-09-22). Mentions are cheaper per
  // token but the strings are the tab.
  const viaRead = (options.attach ?? process.env.GUITARRERO_ATTACH ?? "read") === "read";
  const { dir, mentions } = attach(viaRead ? [] : options.images ?? []);
  const paths = viaRead ? (options.images ?? []).map((image) => `- ${image}`).join("\n") : "";
  const input = mentions
    ? `${mentions}\n\n${prompt}`
    : paths
      ? `Read these image files first, each one in full, in this order:\n${paths}\n\n${prompt}`
      : prompt;

  const args = [
    "-p",
    "--model",
    options.model ?? DEFAULT_MODEL,
    "--output-format",
    "json",
    "--system-prompt",
    options.system,
    // No tools: the images are already attached, and the schemas alone cost thousands of tokens.
    "--tools",
    viaRead ? "Read" : "",
    ...(viaRead ? ["--allowed-tools", "Read"] : []),
    // Skip user/project/local settings, which is what pulls in CLAUDE.md.
    "--setting-sources",
    "",
    // Skip the user's MCP servers and their tool definitions.
    "--strict-mcp-config",
    "--effort",
    options.effort ?? DEFAULT_EFFORT,
  ];

  // Run from the images' folder so the basename mentions above resolve.
  const result = await run("claude", args, { input, cwd: dir ?? options.cwd });
  if (result.code !== 0) {
    throw new Error(
      `claude CLI exited with ${result.code}: ${(result.stderr || result.stdout).slice(-500)}`,
    );
  }

  try {
    const envelope = JSON.parse(result.stdout) as CliEnvelope;
    if (envelope.is_error) throw new Error(envelope.result ?? "unknown CLI error");
    record(envelope);
    return envelope.result ?? "";
  } catch (error) {
    if (error instanceof SyntaxError) return result.stdout; // plain-text fallback
    throw error;
  }
}

interface CliEnvelope {
  result?: string;
  is_error?: boolean;
  total_cost_usd?: number;
  usage?: {
    input_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
    output_tokens?: number;
  };
}

/** Running total for the process, so a run can report what it actually spent. */
const usage = { calls: 0, input: 0, output: 0, costUsd: 0 };

function record(envelope: CliEnvelope): void {
  const u = envelope.usage ?? {};
  usage.calls++;
  usage.input +=
    (u.input_tokens ?? 0) +
    (u.cache_creation_input_tokens ?? 0) +
    (u.cache_read_input_tokens ?? 0);
  usage.output += u.output_tokens ?? 0;
  usage.costUsd += envelope.total_cost_usd ?? 0;
}

export function usageSummary(): string {
  const k = (n: number) => `${(n / 1000).toFixed(1)}k`;
  return `${usage.calls} model calls · ${k(usage.input)} in / ${k(usage.output)} out · $${usage.costUsd.toFixed(2)}`;
}

/** Pulls the first JSON object out of a model reply, fenced or bare. */
export function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`no JSON object in reply: ${text.slice(0, 300)}`);
  }
  return JSON.parse(candidate.slice(start, end + 1)) as T;
}

/** Asks Claude for JSON, retrying once with a stricter nudge if the reply doesn't parse. */
export async function askClaudeJson<T>(prompt: string, options: AskOptions): Promise<T> {
  try {
    return extractJson<T>(await askClaude(prompt, options));
  } catch {
    const retry = `${prompt}\n\nIMPORTANT: reply with the raw JSON object only. No prose, no code fences.`;
    return extractJson<T>(await askClaude(retry, options));
  }
}
