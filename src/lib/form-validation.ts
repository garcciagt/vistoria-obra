import { z } from "zod";
import { FORMS, key } from "./forms";

export const submissionSchema = z.object({
  token: z.string().uuid(),
  respostas: z.record(z.string().max(200), z.string().max(1000)),
}).refine((value) => JSON.stringify(value.respostas).length <= 50000, "Dados muito grandes");

export function otherDetailsError(tipo: string, respostas: Record<string, string>): string | undefined {
  for (const [si, section] of (FORMS[tipo]?.sections ?? []).entries()) {
    for (const field of section.fields) {
      const value = respostas[key(si + 1, field.label)] ?? "";
      if (field.outro && value.split(":")[0] === "Outro" && (value.indexOf(":") < 0 || !value.slice(value.indexOf(":") + 1).trim())) {
        return `Preencha o campo “Outro” em: ${field.label}.`;
      }
    }
  }
  return undefined;
}