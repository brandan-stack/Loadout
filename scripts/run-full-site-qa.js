#!/usr/bin/env node

const { spawn } = require("child_process");

const STARTUP_TIMEOUT_MS = 120000;
const READY_POLL_MS = 1000;

function envVar(name) {
  const value = process.env[name];
  return value ? value.trim() : "";
}

function normalizeBaseUrl(rawBaseUrl, port) {
  if (rawBaseUrl) {
    return rawBaseUrl.replace(/\/$/, "");
  }

  return `http://127.0.0.1:${port}`;
}

function validateEnv() {
  const required = ["LOADOUT_QA_EMAIL", "LOADOUT_QA_PASSWORD", "DATABASE_URL"];
  const missing = required.filter((key) => !envVar(key));

  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(", ")}`);
  }

  const databaseUrl = envVar("DATABASE_URL");
  if (!/^postgres(ql)?:\/\//i.test(databaseUrl)) {
    throw new Error("DATABASE_URL must start with postgresql:// or postgres:// for QA test runs.");
  }
}

function createNpmCommand(args, env) {
  const npmBin = process.platform === "win32" ? "npm.cmd" : "npm";
  return spawn(npmBin, args, {
    stdio: "inherit",
    env,
  });
}

async function waitForReady(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) {
        return;
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, READY_POLL_MS));
  }

  if (lastError) {
    throw new Error(`Timed out waiting for ${url}. Last error: ${lastError.message}`);
  }

  throw new Error(`Timed out waiting for ${url}.`);
}

function stopProcess(child) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null) {
      resolve();
      return;
    }

    child.once("exit", () => resolve());
    child.kill("SIGTERM");

    setTimeout(() => {
      if (child.exitCode === null) {
        child.kill("SIGKILL");
      }
    }, 5000);
  });
}

async function main() {
  const qaPort = envVar("LOADOUT_QA_PORT") || envVar("TEST_PORT") || "3104";
  const qaBaseUrl = normalizeBaseUrl(envVar("LOADOUT_QA_BASE_URL"), qaPort);

  validateEnv();

  const sharedEnv = {
    ...process.env,
    PORT: qaPort,
    TEST_PORT: qaPort,
    LOADOUT_QA_PORT: qaPort,
    LOADOUT_QA_BASE_URL: qaBaseUrl,
    APP_URL: qaBaseUrl,
    NEXT_PUBLIC_APP_URL: qaBaseUrl,
  };

  const serverProcess = createNpmCommand(["run", "dev:test"], sharedEnv);
  let exiting = false;

  const cleanup = async () => {
    if (exiting) {
      return;
    }

    exiting = true;
    await stopProcess(serverProcess);
  };

  const handleSignal = async () => {
    await cleanup();
    process.exit(1);
  };

  process.on("SIGINT", handleSignal);
  process.on("SIGTERM", handleSignal);

  try {
    await waitForReady(`${qaBaseUrl}/login`, STARTUP_TIMEOUT_MS);

    const qaArgs = ["run", "test:qa"];
    const passthroughArgs = process.argv.slice(2);
    if (passthroughArgs.length > 0) {
      qaArgs.push("--", ...passthroughArgs);
    }

    const qaProcess = createNpmCommand(qaArgs, sharedEnv);

    const qaExitCode = await new Promise((resolve, reject) => {
      qaProcess.on("exit", (code) => resolve(code ?? 0));
      qaProcess.on("error", reject);
    });

    await cleanup();
    process.exit(qaExitCode);
  } catch (error) {
    await cleanup();
    console.error(`[test:site] ${error.message}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`[test:site] ${error.message}`);
  process.exit(1);
});
