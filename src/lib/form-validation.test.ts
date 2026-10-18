import { describe, expect, it } from "vitest";
import { otherDetailsError } from "./form-validation";

describe("Detalhes de Outro", () => {
  it("impede enviar Outro sem detalhes no formulário de vistoria", () => {
    expect(otherDetailsError("vistoria", { "6. Relação com o proprietário": "Outro:   " })).toBeDefined();
  });
  it("impede enviar Outro sem detalhes no formulário de projeto", () => {
    expect(otherDetailsError("projeto", { "4. Tipo de construção": "Outro" })).toBeDefined();
  });
  it("permite enviar Outro com detalhes preenchidos", () => {
    expect(otherDetailsError("projeto", { "4. Finalidade da construção": "Outro: Institucional" })).toBeUndefined();
  });
});