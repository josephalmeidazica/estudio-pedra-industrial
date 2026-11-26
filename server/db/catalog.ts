/**
 * The studio's catalogue as of the client's ficha técnica sheet (2026-11-26).
 * Variants of a piece (Mesa Urb 2, Mesa Office L, Luminária Lua com cúpula…)
 * live inside that piece's ficha. Pieces without photos yet are drafts the
 * owner publishes from /admin once a photo is uploaded.
 *
 * `price` is the owner's reference (the base version's value) and is never
 * sent to the public site.
 */
export type CatalogPiece = {
  slug: string;
  name: string;
  description: string;
  category: string;
  materials: string;
  dimensions: string;
  finishes: string;
  details: string;
  leadTime: string;
  price: number | null;
  published: boolean;
  isCustom?: boolean;
};

const SEVEN_DAYS = "7 dias após a aprovação do projeto";
const ONE_TWO_WEEKS = "1 a 2 semanas após a aprovação do projeto";
const TWO_THREE_WEEKS = "2 a 3 semanas após a aprovação do projeto";
const STEEL_20_MDF_INOX = "Aço carbono (tubo 20 × 20 mm), prateleiras em MDF e pés em aço inox";

export const CATALOG: CatalogPiece[] = [
  {
    slug: "estrutura-gaia",
    name: "Estrutura Gaia",
    description: "Estrutura modular para plantas que se adapta a qualquer ambiente",
    category: "Estruturas",
    materials: "Aço carbono (tubo 20 × 20 mm) e tampo em pinus",
    dimensions: "60 × 60 × 122 cm (L × P × A)",
    finishes: "",
    details: "Suporte de chão para plantas\nQuatro espaços de tamanhos diferentes",
    leadTime: TWO_THREE_WEEKS,
    price: 626,
    published: true,
  },
  {
    slug: "estante-divisio",
    name: "Estante Divisio",
    description: "Estante modular em aço carbono e MDF que organiza espaços com elegância",
    category: "Estantes",
    materials: STEEL_20_MDF_INOX,
    dimensions: "104 × 40 × 200 cm (L × P × A)",
    finishes: "",
    details: "Seis divisões de tamanhos diferentes que formam um desenho único\nPrateleiras em MDF que dão vida ao aço\nPés niveladores",
    leadTime: TWO_THREE_WEEKS,
    price: 1650,
    published: true,
  },
  {
    slug: "luminaria-lua",
    name: "Luminária Lua",
    description: "Luminária com ângulos arredondados que traz a serenidade para os seus ambientes",
    category: "Luminárias",
    materials: "Aço carbono (tubo 3/4\"), base em metalon 50 × 30 mm e pé em aço inox",
    dimensions: "20 × 20 × 170 cm (L × P × A)",
    finishes: "",
    details:
      "Topo em semicírculo, o charme da peça\nLâmpada de luz quente de 4 W\nBase quadrada de 20 cm\nCabo de 1,20 m com plugue curvo para tomadas de difícil acesso\nInterruptor e tomada de 10 A\nTambém com cúpula de tecido",
    leadTime: TWO_THREE_WEEKS,
    price: 310,
    published: true,
  },
  {
    slug: "luminaria-sol",
    name: "Luminária Sol",
    description: "Luminária com ângulos retos que ilumina o seu ambiente",
    category: "Luminárias",
    materials: "Aço carbono (tubo 3/4\"), base em metalon 50 × 30 mm e pé em aço inox",
    dimensions: "20 × 20 × 170 cm (L × P × A)",
    finishes: "",
    details:
      "Topo quadrado que lembra um hexágono\nLâmpada de luz quente de 4 W\nBase quadrada de 20 cm\nCabo de 1,20 m com plugue curvo para tomadas de difícil acesso\nInterruptor e tomada de 10 A",
    leadTime: TWO_THREE_WEEKS,
    price: 286,
    published: true,
  },
  {
    slug: "mesa-cabeceira-loft",
    name: "Mesa de Cabeceira Loft",
    description: "Minimalismo, força e identidade urbana. Opções com gaveta e gaveta + nicho",
    category: "Mesas",
    materials: "Aço carbono (tubo 20 × 20 mm) e MDF branco",
    dimensions: "39 × 42 × 60 cm (L × P × A)",
    finishes: "",
    details:
      "Estrutura de aço minimalista\nLoft: uma gaveta (bloco de MDF de 35 × 42 × 21 cm)\nLoft 2: nicho e gaveta (bloco de MDF de 35 × 42 × 38 cm)",
    leadTime: TWO_THREE_WEEKS,
    price: 289,
    published: true,
  },
  {
    slug: "mesa-office-l",
    name: "Mesa Office",
    description: "Mesas de escritório padronizadas ou em formato L, perfeitas para home office",
    category: "Mesas",
    materials: "MDF e aço carbono (tubos 50 × 30 mm e 30 × 30 mm)",
    dimensions: "Mesa Office: 120 × 60 × 75 cm (L × P × A)\nMesa Office L: 150 × 50 × 75 cm + 100 × 50 × 75 cm",
    finishes: "Estrutura em preto ou branco fosco",
    details: "Estrutura reforçada para o dia a dia de trabalho\nPés niveladores em aço inox\nReta ou em formato L",
    leadTime: TWO_THREE_WEEKS,
    price: 855,
    published: true,
  },
  {
    slug: "mesa-urb",
    name: "Mesa Urb",
    description: "Mesa compacta para sala ou quarto em aço carbono com design contemporâneo",
    category: "Mesas",
    materials: "MDF e aço carbono (tubo 20 × 20 mm)",
    dimensions: "37 × 60 × 67 cm (L × P × A)",
    finishes: "Pintura personalizada: você escolhe a cor do tampo e da estrutura",
    details: "Encaixe em C que entra por baixo de sofás e poltronas\nUrb 2: com quatro colunas de aço nas laterais",
    leadTime: SEVEN_DAYS,
    price: 185,
    published: true,
  },
  {
    slug: "penteadeira-glam",
    name: "Penteadeira Glam",
    description: "Penteadeira sofisticada que combina funcionalidade e elegância",
    category: "Penteadeiras",
    materials: "Aço carbono (tubo 20 × 20 mm), MDF branco e pés em aço inox",
    dimensions: "100 × 50 × 75 cm (L × P × A)",
    finishes: "",
    details:
      "Estrutura de aço reforçada\nBaú em MDF branco com pistão que segura a tampa aberta\nDivisórias internas e espaço para vidro\nTambém com duas prateleiras na estrutura",
    leadTime: TWO_THREE_WEEKS,
    price: 940,
    published: true,
  },
  {
    slug: "movel-personalizado",
    name: "Móvel personalizado",
    description: "Não achou o que procura? Descreva o móvel dos seus sonhos e fazemos sob medida.",
    category: "Personalizados",
    materials: "Aço carbono, MDF",
    dimensions: "",
    finishes: "",
    details: "",
    leadTime: "",
    price: null,
    published: true,
    isCustom: true,
  },

  // Drafts: in the sheet, no photo yet.
  {
    slug: "estante-com-armario",
    name: "Estante com Armário",
    description: "Estante em aço carbono e MDF com nicho, prateleiras e um armário fechado",
    category: "Estantes",
    materials: STEEL_20_MDF_INOX,
    dimensions: "100 × 35 × 200 cm (L × P × A)",
    finishes: "",
    details: "Seis divisões: um nicho, quatro prateleiras e um armário fechado\nPrateleiras em MDF que dão vida ao aço\nPés niveladores",
    leadTime: TWO_THREE_WEEKS,
    price: 1853,
    published: false,
  },
  {
    slug: "estante-veredas",
    name: "Estante Veredas",
    description: "Estante estreita em aço carbono e MDF, também com a última prateleira prolongada",
    category: "Estantes",
    materials: STEEL_20_MDF_INOX,
    dimensions: "Veredas: 40 × 40 × 180 cm (L × P × A)\nVeredas prolongada: 40 × 40 × 180 cm, última prateleira com 130 × 40 cm",
    finishes: "",
    details:
      "Seis divisões (sete na prolongada)\nNa prolongada, a última prateleira avança 90 cm além das outras\nPrateleiras em MDF que dão vida ao aço\nPés niveladores",
    leadTime: TWO_THREE_WEEKS,
    price: 938,
    published: false,
  },
  {
    slug: "estante-uniforme",
    name: "Estante Uniforme",
    description: "Estante larga em aço carbono e MDF, em altura inteira ou meia altura",
    category: "Estantes",
    materials: STEEL_20_MDF_INOX,
    dimensions: "Uniforme: 120 × 30 × 160 cm (L × P × A)\nUniforme meia altura: 120 × 30 × 80 cm",
    finishes: "",
    details: "Cinco divisões (três na meia altura)\nPrateleiras em MDF que dão vida ao aço\nPés niveladores",
    leadTime: TWO_THREE_WEEKS,
    price: 943,
    published: false,
  },
  {
    slug: "clavis",
    name: "Clavis",
    description: "Porta-chaves de parede em aço carbono, com uma pequena prateleira",
    category: "Acessórios",
    materials: "Aço carbono (tubo 20 × 20 mm) e MDF",
    dimensions: "40 × 20 × 20 cm (L × P × A)",
    finishes: "",
    details: "Ganchos para 5 chaves\nUma prateleira pequena",
    leadTime: SEVEN_DAYS,
    price: 95,
    published: false,
  },
  {
    slug: "rack-vide",
    name: "Rack Vide",
    description: "Rack de TV aberto, em estilo industrial",
    category: "Racks",
    materials: "Aço carbono (tubos 30 × 30 mm, 20 × 20 mm e 3/4\") e MDF",
    dimensions: "150 × 42 × 60 cm (L × P × A)",
    finishes: "",
    details: "Quatro espaços\nTampo de 150 × 40 cm, duas prateleiras de 50 × 40 cm e uma de 36 × 40 cm, em MDF",
    leadTime: TWO_THREE_WEEKS,
    price: 1046,
    published: false,
  },
  {
    slug: "floreira",
    name: "Floreira",
    description: "Floreira de três níveis em aço carbono, de parede ou de chão",
    category: "Estruturas",
    materials: "Aço carbono (tubo 20 × 20 mm) e 3 vasos jardineira",
    dimensions: "De parede: 42 × 16 × 100 cm (L × P × A)\nDe chão: 42 × 20 × 100 cm",
    finishes: "",
    details: "Três níveis, com um vaso jardineira em cada\nPratinho antidengue nos vasos\nDe parede ou de chão",
    leadTime: SEVEN_DAYS,
    price: 478,
    published: false,
  },
  {
    slug: "suporte-maquina-de-lavar",
    name: "Suporte para Máquina de Lavar",
    description: "Suporte reforçado para a máquina de lavar, inteiro em aço carbono",
    category: "Estruturas",
    materials: "Aço carbono (tubo 30 × 30 mm) e tampo em chapa de aço 14",
    dimensions: "69 × 62 × 90 cm (L × P × A)",
    finishes: "",
    details: "Feito inteiramente em aço carbono\nEstrutura reforçada",
    leadTime: TWO_THREE_WEEKS,
    price: 830,
    published: false,
  },
  {
    slug: "banco-de-jardim",
    name: "Banco de Jardim",
    description: "Banco de jardim em aço galvanizado com assento de pinus",
    category: "Bancos",
    materials: "Aço carbono galvanizado (tubo 30 × 30 mm) e pinus",
    dimensions: "100 × 36 × 44 cm (L × P × A)",
    finishes: "",
    details: "Estrutura em aço galvanizado\nAssento em tábuas de pinus",
    leadTime: ONE_TWO_WEEKS,
    price: 516,
    published: false,
  },
];
