import chalk from "chalk";

export type LogLevel = "debug" | "info" | "warn" | "error";

let currentLevel: LogLevel = "info";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel];
}

export const log = {
  debug(msg: string, ...args: unknown[]): void {
    if (shouldLog("debug")) {
      console.log(chalk.gray(`[debug] ${msg}`), ...args);
    }
  },

  info(msg: string, ...args: unknown[]): void {
    if (shouldLog("info")) {
      console.log(chalk.blue(`[info] ${msg}`), ...args);
    }
  },

  warn(msg: string, ...args: unknown[]): void {
    if (shouldLog("warn")) {
      console.warn(chalk.yellow(`[warn] ${msg}`), ...args);
    }
  },

  error(msg: string, ...args: unknown[]): void {
    if (shouldLog("error")) {
      console.error(chalk.red(`[error] ${msg}`), ...args);
    }
  },

  success(msg: string, ...args: unknown[]): void {
    if (shouldLog("info")) {
      console.log(chalk.green(msg), ...args);
    }
  },
};
