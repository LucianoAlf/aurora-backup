const SAFE_FIELDS = new Set(['tool', 'code', 'duration_ms', 'retryable']);

export function createLogger(write = (line) => process.stderr.write(`${line}\n`)) {
  function emit(event, fields = {}) {
    const safe = { event };
    for (const [key, value] of Object.entries(fields)) {
      if (SAFE_FIELDS.has(key) && value !== undefined && value !== null) safe[key] = value;
    }
    write(JSON.stringify(safe));
  }

  return Object.freeze({ emit });
}

export const logger = createLogger();
