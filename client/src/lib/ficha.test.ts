import { expect, test } from "vitest";
import { fichaRows } from "./ficha";
const site = { leadTime: null, warranty: "3 meses contra defeitos de fabricação" };
test("rows in order, empties skipped, details joined, prazo hidden until known", () => {
  const rows = fichaRows({ dimensions: "60 × 40 × 65 cm", materials: "Aço carbono, MDF", finishes: "", details: "Base em C\n\nSapatas niveladoras", isCustom: false }, site);
  expect(rows).toEqual([
    { label: "Medidas", value: "60 × 40 × 65 cm · feita na medida do seu espaço" },
    { label: "Materiais", value: "Aço carbono, MDF" },
    { label: "Detalhes", value: "Base em C · Sapatas niveladoras" },
    { label: "Garantia", value: "3 meses contra defeitos de fabricação" },
  ]);
  expect(fichaRows({ dimensions: "", materials: "", finishes: "", details: "", isCustom: true }, { ...site, leadTime: "3 a 5 semanas" }).map((r) => r.label)).toEqual(["Prazo", "Garantia"]);
});
