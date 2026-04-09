/**
 * Executor: spawns Claude Code CLI as a subprocess.
 */

export interface ExecutorOptions {
  prompt: string;
  workDir: string;
}

export interface ExecutorResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export function buildClaudeArgs(options: ExecutorOptions): string[] {
  return ["--print", "--dangerously-skip-permissions", options.prompt];
}

export async function executeAgent(options: ExecutorOptions): Promise<ExecutorResult> {
  const args = buildClaudeArgs(options);

  const proc = Bun.spawn(["claude", ...args], {
    cwd: options.workDir,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  const exitCode = await proc.exited;

  return { exitCode, stdout, stderr };
}
