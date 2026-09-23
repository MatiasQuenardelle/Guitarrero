import { spawn } from "node:child_process";

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface RunOptions {
  /** Written to the child's stdin, then closed. */
  input?: string;
  /** Echo the child's stderr as it arrives (ffmpeg / yt-dlp progress). */
  echo?: boolean;
  cwd?: string;
}

/** Runs a command to completion, capturing both streams. Never throws on a non-zero exit. */
export function run(
  command: string,
  args: string[],
  options: RunOptions = {},
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      if (options.echo) process.stderr.write(chunk);
    });

    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? -1, stdout, stderr }));

    if (options.input !== undefined) child.stdin.write(options.input);
    child.stdin.end();
  });
}

/** Like run(), but throws when the command fails. */
export async function runOrThrow(
  command: string,
  args: string[],
  options: RunOptions = {},
): Promise<RunResult> {
  const result = await run(command, args, options);
  if (result.code !== 0) {
    const detail = (result.stderr || result.stdout).trim().split("\n").slice(-8).join("\n");
    throw new Error(`${command} exited with ${result.code}\n${detail}`);
  }
  return result;
}

/** Captures raw bytes from stdout (used for ffmpeg rawvideo output). */
export function runBinary(command: string, args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "ignore"] });
    const chunks: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.on("error", reject);
    child.on("close", () => resolve(Buffer.concat(chunks)));
  });
}
