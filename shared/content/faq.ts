import { slugify } from "../slug";

/** `a` may hold several paragraphs separated by "\n"; the page keeps the line breaks. */
export type FaqItem = { q: string; a: string };

const THEMES: { theme: string; items: FaqItem[] }[] = [
  {
    theme: "Prazo e pedido",
    items: [
      {
        q: "Quanto tempo leva para uma peça ficar pronta?",
        a: "Nossas peças são feitas de forma artesanal, então vai depender do projeto, mas pedimos de 2 a 5 semanas para realização e entrega.",
      },
      {
        q: "Vocês produzem apenas os produtos que aparecem no portfólio?",
        a: "Não, fazemos projetos personalizados sob medida. Entre em contato conosco e saiba mais.",
      },
      {
        q: "Preciso saber as medidas exatas para pedir orçamento?",
        a: "Não, para solicitar um orçamento, precisamos da ideia e de medidas aproximadas. No momento da compra dos materiais e da produção, aí sim, são necessárias as medidas exatas.",
      },
      {
        q: "Posso ver o projeto antes de fechar?",
        a: "Sim, enviamos um projeto em 3D no SketchUp para você visualizar antes de tomar a decisão!",
      },
    ],
  },
  {
    theme: "Pagamento",
    items: [
      {
        q: "Quais são as formas de pagamento?",
        a: "Aceitamos pagamento via Pix, débito ou crédito. As taxas no crédito estão sujeitas a modificações de acordo com o parcelamento. No Pix, há um desconto de 5%.\nImportante lembrar que, para todo projeto, solicitamos o pagamento de um sinal de 50%, para que a compra dos materiais seja realizada. A forma de pagamento do sinal é somente à vista.",
      },
      {
        q: "O orçamento tem custo?",
        a: "Não! Enviamos um orçamento em PDF e um projeto em 3D no SketchUp de forma totalmente gratuita. Você só paga depois de fechar conosco!",
      },
    ],
  },
  {
    theme: "Entrega e instalação",
    items: [
      {
        q: "Vocês entregam onde?",
        a: "Entregamos em BH e região metropolitana (a combinar). Além disso, estamos situados no bairro Céu Azul, onde também é possível fazer a retirada dos produtos.",
      },
      {
        q: "A instalação está incluída?",
        a: "Sim, colocamos no orçamento o valor da instalação, mas caso não deseje, é só pedir pra gente retirar!",
      },
    ],
  },
  {
    theme: "Materiais e cuidados",
    items: [
      {
        q: "Quais materiais vocês usam?",
        a: "Todos os nossos projetos são realizados com o metalon fabricado em aço carbono e o MDF em diferentes tonalidades.",
      },
      {
        q: "Posso escolher a cor da estrutura e do MDF?",
        a: "Sim! Todo o projeto é 100% personalizável, você escolhe desde a cor da estrutura, até mesmo o formato da lâmpada.",
      },
      {
        q: "Como cuidar das minhas peças?",
        a: "O cuidado com o MDF e com o metalon é bem simples:\nSugerimos não deixar as peças expostas ao sol e chuva frequentes;\nPara realizar a limpeza das peças, opte por panos úmidos sem produtos corrosivos ou que possam danificar as estruturas. A água e, de vez em quando, um desinfetante funcionam bem.",
      },
    ],
  },
  {
    theme: "Garantia",
    items: [
      {
        q: "Qual é a garantia?",
        a: "Aqui no Estúdio, todas as peças possuem 3 meses de garantia. Na parte inferior da sua peça terá um selo com a data que o produto foi entregue e este selo garantirá a possível manutenção, caso se faça necessária. Sendo assim, é importante que você não retire esta etiqueta e não a danifique.",
      },
    ],
  },
];

export const FAQ: { theme: string; slug: string; items: FaqItem[] }[] = THEMES.map((t) => ({ ...t, slug: slugify(t.theme) }));
