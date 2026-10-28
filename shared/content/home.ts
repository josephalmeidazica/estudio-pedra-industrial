export const HOME = {
  hero: {
    label: "Móveis industriais planejados · BH e região metropolitana",
    title: "Móveis industriais sob medida, em ferro e madeira.",
    text: "Projetamos e fabricamos peças únicas em aço carbono e MDF, pensadas para o seu espaço. Da primeira conversa ao acabamento, tudo é feito no nosso estúdio.",
  },
  diferenciais: [
    { icon: "hammer", label: "Fabricação própria", text: "Corte, solda e pintura no nosso estúdio" },
    { icon: "ruler", label: "Peças sob medida", text: "Projeto aprovado antes de qualquer corte" },
    { icon: "shield", label: "Garantia de 3 meses", text: "Contra defeitos de fabricação" },
    { icon: "pin", label: "BH e região metropolitana", text: "Entrega e instalação agendadas" },
  ] as { icon: "hammer" | "ruler" | "shield" | "pin"; label: string; text: string }[],
  servicos: [
    {
      icon: "mesa-urb",
      title: "Estilo industrial",
      text: "Projetamos e fabricamos peças no estilo industrial com aço carbono e MDF.",
      linkLabel: "Ver peças no portfólio →",
    },
    {
      icon: "reforma-sofa",
      title: "Reforma de móveis",
      text: "Reformamos móveis antigos e deteriorados com reconstituição em ferro.",
      linkLabel: "Ver reformas no portfólio →",
    },
    {
      icon: "mesa-office-l",
      title: "Projetos personalizados",
      text: "Criamos peças sob medida a partir da sua ideia, do seu espaço e das suas medidas.",
      linkLabel: "Ver peças sob medida →",
    },
  ] as { icon: "mesa-urb" | "reforma-sofa" | "mesa-office-l"; title: string; text: string; linkLabel: string }[],
  cta: {
    title: "Transforme seu espaço.",
    text: "Conta pra gente o que você imagina e receba um orçamento sob medida pelo WhatsApp.",
  },
};
