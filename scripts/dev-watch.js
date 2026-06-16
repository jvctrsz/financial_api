const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const tscBin = path.join(
  projectRoot,
  'node_modules',
  'typescript',
  'bin',
  'tsc',
);
const isDebug = process.argv.includes('--debug');

let appProcess;
let restarting = false;

const getEntryFile = () => {
  const nestedEntry = path.join(projectRoot, 'dist', 'src', 'main.js');
  const rootEntry = path.join(projectRoot, 'dist', 'main.js');

  return fs.existsSync(nestedEntry) ? nestedEntry : rootEntry;
};

const startApp = () => {
  const entryFile = getEntryFile();

  if (!fs.existsSync(entryFile)) {
    return;
  }

  const nodeArgs = ['--enable-source-maps'];

  if (isDebug) {
    nodeArgs.push('--inspect');
  }

  nodeArgs.push(entryFile);

  appProcess = spawn(process.execPath, nodeArgs, {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
  });

  appProcess.on('exit', () => {
    appProcess = undefined;
  });
};

const stopApp = async () =>
  new Promise((resolve) => {
    if (!appProcess) {
      resolve();
      return;
    }

    const currentProcess = appProcess;
    appProcess = undefined;

    currentProcess.once('exit', resolve);
    currentProcess.kill();

    setTimeout(() => {
      if (!currentProcess.killed) {
        currentProcess.kill('SIGKILL');
      }
      resolve();
    }, 2_000).unref();
  });

const restartApp = async () => {
  if (restarting) {
    return;
  }

  restarting = true;
  await stopApp();
  startApp();
  restarting = false;
};

const compiler = spawn(
  process.execPath,
  [
    tscBin,
    '--watch',
    '--project',
    'tsconfig.build.json',
    '--preserveWatchOutput',
  ],
  {
    cwd: projectRoot,
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe'],
  },
);

const handleCompilerOutput = (chunk, stream) => {
  const text = chunk.toString();
  stream.write(text);

  if (/Found 0 errors/.test(text)) {
    void restartApp();
  }
};

compiler.stdout.on('data', (chunk) =>
  handleCompilerOutput(chunk, process.stdout),
);
compiler.stderr.on('data', (chunk) =>
  handleCompilerOutput(chunk, process.stderr),
);

const shutdown = async () => {
  await stopApp();
  compiler.kill();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

compiler.on('exit', async (code) => {
  await stopApp();
  process.exit(code ?? 0);
});
