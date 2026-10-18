/** Serialize writes and coalesce edits made while a write is in flight. */
export function createAutosaveQueue<T>(write: (value: T) => Promise<unknown>) {
  let pending: { value: T } | undefined;
  let running: Promise<void> | undefined;
  return (value: T): Promise<void> => {
    pending = { value };
    if (!running) {
      running = (async () => {
        while (pending) {
          const current = pending.value;
          pending = undefined;
          await write(current);
        }
      })().finally(() => { running = undefined; });
    }
    return running;
  };
}