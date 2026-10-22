import { slugify } from "../slug";

export type FaqItem = { q: string; a: string };

const THEMES: { theme: string; items: FaqItem[] }[] = [
  {
    theme: "Prazo e pedido",
    items: [
      {
        q: "Quanto tempo leva para ficar pronta uma peça?",
        a: "Depende da peça e da fila da oficina. Luminárias e mesas de cabeceira costumam ser mais rápidas; estantes e móveis grandes, mais demoradas. O prazo exato vai no orçamento.",
      },
      {
        q: "Vocês fazem só o que está no portfólio?",
        a: "Não. O portfólio mostra peças que já fizemos, mas a maior parte dos pedidos é sob medida: mudamos medidas, cores e materiais ou desenhamos algo do zero a partir da sua referência.",
      },
      {
        q: "Preciso saber as medidas exatas para pedir orçamento?",
        a: "Não. Mande as medidas aproximadas que conferimos depois, pessoalmente em BH e região ou com um guia simples de medição.",
      },
      {
        q: "Posso ver o projeto antes de fechar?",
        a: "Sim. Você recebe a ficha técnica com desenho, medidas, materiais e acabamento, e nada é cortado antes da sua aprovação.",
      },
    ],
  },
  {
    theme: "Pagamento",
    items: [
      {
        q: "Como funciona o pagamento?",
        a: "Combinamos um sinal para iniciar a produção e o restante na entrega. As formas de pagamento vão no orçamento.",
      },
      {
        q: "O orçamento tem custo?",
        a: "Não. A conversa, a estimativa e o orçamento fechado são gratuitos. As condições da visita técnica são combinadas no WhatsApp.",
      },
    ],
  },
  {
    theme: "Entrega e instalação",
    items: [
      {
        q: "Vocês entregam onde?",
        a: "Atendemos Belo Horizonte e região metropolitana, com entrega e instalação agendadas. Para outras cidades, consulte: avaliamos caso a caso o envio.",
      },
      {
        q: "A instalação está incluída?",
        a: "Peças que precisam de fixação na parede, como estantes e prateleiras, são instaladas pela nossa equipe em BH e região. Peças soltas, como mesas e luminárias, chegam prontas para usar.",
      },
    ],
  },
  {
    theme: "Materiais e cuidados",
    items: [
      {
        q: "Quais materiais vocês usam?",
        a: "Aço carbono na estrutura, com pintura eletrostática, e MDF ou madeira nos tampos e prateleiras. Outros materiais, como vidro e madeira maciça, sob consulta.",
      },
      {
        q: "Posso escolher a cor da estrutura?",
        a: "Sim. O preto fosco é o padrão, e outras cores da carta de pintura eletrostática podem ser escolhidas no projeto.",
      },
      {
        q: "Como cuidar do aço carbono?",
        a: "Pano macio seco ou levemente úmido; nada de produtos abrasivos. Em áreas externas cobertas a pintura protege bem, mas evite chuva direta. Pequenos riscos podem ser retocados: é só nos chamar.",
      },
    ],
  },
  {
    theme: "Garantia",
    items: [
      {
        q: "Qual é a garantia?",
        a: "3 meses contra defeitos de fabricação, como solda, pintura e estrutura. Danos por uso, umidade ou transporte feito por terceiros não estão cobertos.",
      },
      {
        q: "E se a peça chegar diferente do projeto?",
        a: "Conferimos as medidas antes da entrega, mas se algo não bater com a ficha técnica aprovada, corrigimos sem custo.",
      },
    ],
  },
];

export const FAQ: { theme: string; slug: string; items: FaqItem[] }[] = THEMES.map((t) => ({ ...t, slug: slugify(t.theme) }));
