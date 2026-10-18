import { describe, expect, it } from "vitest";
import { isApontamento } from "./apontamentos";

describe("seleção de apontamentos", () => {
  it("não inclui automaticamente uma resposta Não", () => {
    expect(isApontamento(undefined)).toBe(false);
  });
  it("inclui somente a seleção explícita e permite desmarcar", () => {
    expect(isApontamento({ apontamento: true })).toBe(true);
    expect(isApontamento({ apontamento: false })).toBe(false);
  });
});