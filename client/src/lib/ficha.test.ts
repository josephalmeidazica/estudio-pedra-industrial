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

test("a piece's own prazo wins over the site default", () => {
  const p = { dimensions: "", materials: "", finishes: "", details: "", isCustom: false };
  const withSite = { ...site, leadTime: "2 a 5 semanas" };
  expect(fichaRows({ ...p, leadTime: "7 dias após a aprovação do projeto" }, withSite).find((r) => r.label === "Prazo")?.value).toBe("7 dias após a aprovação do projeto");
  expect(fichaRows({ ...p, leadTime: "  " }, withSite).find((r) => r.label === "Prazo")?.value).toBe("2 a 5 semanas");
});

test("several measurement lines (one per version) stay on their own lines", () => {
  const p = { dimensions: "Mesa Office: 120 × 60 × 75 cm\n\nMesa Office L: 150 × 50 × 75 cm", materials: "", finishes: "", details: "", isCustom: false };
  expect(fichaRows(p, site)[0]).toEqual({
    label: "Medidas",
    value: "Mesa Office: 120 × 60 × 75 cm\nMesa Office L: 150 × 50 × 75 cm\nFeita na medida do seu espaço",
  });
});
