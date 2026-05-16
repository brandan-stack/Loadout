#!/usr/bin/env node

const { spawn } = require("child_process");

function resolvePort(defaultPort) {
  const rawPort = process.env.PORT || process.env.npm_config_port || defaultPort;
  const parsedPort = Number.parseInt(rawPort, 10);

  if (Number.isFinite(parsedPort) && parsedPort > 0) {
    return String(parsedPort);
  }

  return defaultPort;
}

function run() {
  const [, , command = "dev", defaultPort = "3004", ...args] = process.argv;
  const port = resolvePort(defaultPort);
  const nextBin = require.resolve("next/dist/bin/next");

  const child = spawn(process.execPath, [nextBin, command, "-p", port, ...args], {
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: port,
    },
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

if (require.main === module) {
  run();
}

module.exports = {
  resolvePort,
};