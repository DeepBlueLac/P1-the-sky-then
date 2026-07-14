import { spawn } from 'node:child_process';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const server = spawn(process.execPath, ['scripts/serve-static.mjs'], { stdio: 'inherit' });
const projectRoot = process.cwd();

function waitForServer(attempts = 30) {
  return new Promise((resolve, reject) => {
    const probe = () => {
      const check = request('http://127.0.0.1:4173', (response) => {
        response.resume();
        resolve();
      });
      check.once('error', () => {
        if (attempts-- <= 0) reject(new Error('端到端测试服务器未能启动。'));
        else setTimeout(probe, 200);
      });
      check.end();
    };
    probe();
  });
}

try {
  await waitForServer();
  const runner = spawn(
    process.execPath,
    [join(projectRoot, 'node_modules', '@playwright', 'test', 'cli.js'), 'test', '--config', join(projectRoot, 'playwright.config.ts')],
    { cwd: tmpdir(), stdio: 'inherit', env: { ...process.env, CHROME_LOG_FILE: join(tmpdir(), 'the-sky-then-chromium.log') } },
  );
  const exitCode = await new Promise((resolve) => runner.once('exit', (code) => resolve(code ?? 1)));
  process.exitCode = exitCode;
} finally {
  server.kill();
}
