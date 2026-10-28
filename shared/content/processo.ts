export type ProcessStep = {
  n: string;
  title: string;
  homeTitle?: string;
  inHome: boolean;
  icon: "whatsapp" | "ruler" | "pencil-ruler" | "wrench" | "truck";
  lead: string;
  summary: string;
  bullets: string[];
};

export const PROCESSO: { intro: { title: string; text: string }; steps: ProcessStep[] } = {
  intro: {
    title: "Como uma ideia vira uma peça do Estúdio Pedra Industrial.",
    text: "Cinco etapas, sempre pelo WhatsApp, sem surpresa no fim. Você aprova o projeto antes de qualquer corte e acompanha a fabricação do início ao fim.",
  },
  steps: [
    {
      n: "01",
      title: "Conversa",
      inHome: true,
      icon: "whatsapp",
      lead: "Você manda pelo WhatsApp uma foto de referência, uma ideia ou as medidas do espaço. Pode ser uma peça do portfólio ou algo do zero.",
      summary: "Você manda uma foto, uma ideia ou as medidas pelo WhatsApp. Respondemos em horário comercial.",
      bullets: [
        "Resposta em até 1 dia útil, em horário comercial",
        "Você nos explica o que deseja produzir",
        "Combinamos a próxima etapa: medir no local ou você envia as medidas",
      ],
    },
    {
      n: "02",
      title: "Medidas",
      inHome: true,
      icon: "ruler",
      lead: "Para Belo Horizonte e região metropolitana, podemos medir no local. Fora disso, orientamos você a medir e conferimos tudo antes do projeto.",
      summary: "Medimos no local em BH e região, ou orientamos você a medir.",
      bullets: [
        "Visita técnica em BH e região metropolitana",
        "Guia simples de como medir, com as três medidas que importam",
        "Conferência de tomadas, rodapés e portas que interferem na peça",
      ],
    },
    {
      n: "03",
      title: "Projeto e orçamento",
      homeTitle: "Projeto",
      inHome: true,
      icon: "pencil-ruler",
      lead: "Desenhamos a peça para o seu espaço e fechamos materiais, acabamento e valor. Nada é feito antes da sua aprovação.",
      summary: "Desenhamos a peça para o seu espaço e alinhamos materiais, acabamento e valor.",
      bullets: [
        "Orçamento em PDF e projeto em 3D para visualização",
        "Opções de acabamento: cor da pintura e tipo de madeira ou MDF",
        "Combinamos a forma de pagamento e o prazo de entrega",
      ],
    },
    {
      n: "04",
      title: "Fabricação",
      inHome: true,
      icon: "wrench",
      lead: "Corte, solda, pintura e acabamento feitos no nosso estúdio em Belo Horizonte.",
      summary: "Corte, solda, pintura e acabamento feitos no nosso estúdio, peça por peça.",
      bullets: [
        "Prazo médio de 2 a 5 semanas, conforme a peça",
        "Fotos das etapas principais: estrutura soldada, pintura, montagem",
        "Conferência final das medidas antes da entrega",
      ],
    },
    {
      n: "05",
      title: "Entrega e instalação",
      homeTitle: "Entrega",
      inHome: true,
      icon: "truck",
      lead: "Entregamos e, quando a peça pede, instalamos em BH e região metropolitana. Outras cidades sob consulta.",
      summary: "Combinamos a entrega e, se precisar, a instalação. Garantia de 3 meses.",
      bullets: [
        "Entrega agendada com você",
        "Garantia de 3 meses contra defeitos de fabricação",
        "Orientações de cuidado com o aço carbono e a madeira",
      ],
    },
  ],
};

export function homeSteps(): ProcessStep[] {
  return PROCESSO.steps.filter((s) => s.inHome);
}
