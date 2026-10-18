import { describe, expect, it } from "vitest";
import { createAutosaveQueue } from "./autosave";

describe("inspection autosave", () => {
  it("writes the latest edit last, without overlapping older requests", async () => {
    let release: (() => void) | undefined;
    const first = new Promise<void>((resolve) => { release = resolve; });
    const saved: string[] = [];
    const save = createAutosaveQueue<string>(async (value) => {
      if (value === "initial") await first;
      saved.push(value);
    });
    const done = save("initial");
    void save("intermediate");
    void save("latest");
    expect(saved).toEqual([]);
    release?.();
    await done;
    expect(saved).toEqual(["initial", "latest"]);
  });

  it("can retry after a failed write", async () => {
    let fail = true;
    const saved: string[] = [];
    const save = createAutosaveQueue<string>(async (value) => {
      if (fail) throw new Error("offline");
      saved.push(value);
    });
    await expect(save("draft")).rejects.toThrow("offline");
    fail = false;
    await save("draft");
    expect(saved).toEqual(["draft"]);
  });
});