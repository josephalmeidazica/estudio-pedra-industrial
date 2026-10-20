const FOOTER_LINKS: { label: string; href: string }[] = [
  { label: "Serviços", href: "/#servicos" },
  { label: "Sobre", href: "/#sobre" },
  { label: "Portfólio", href: "/catalogo" },
  { label: "Contato", href: "/contato" },
];

export function SiteFooter() {
  return (
    <footer className="py-16 bg-card border-t border-border">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="mb-6">
              <img
                src="/logo.png"
                alt="Estúdio Pedra Industrial Logo"
                className="w-16 h-16 object-contain mb-4"
              />
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Móveis em aço carbono e MDF que transformam espaços em experiências.
            </p>
          </div>
          <div>
            <h4 className="heading-secondary text-sm mb-6 text-foreground">Navegação</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {FOOTER_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="hover:text-foreground transition-colors duration-300">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="heading-secondary text-sm mb-6 text-foreground">Contato</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>@estudio.pedraindustrial</li>
              <li>(31) 97180-3551</li>
              <li>Belo Horizonte - MG</li>
            </ul>
          </div>
          <div>
            <h4 className="heading-secondary text-sm mb-6 text-foreground">Horário</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>Seg-Sex: 8h - 18h</li>
              <li>Sábado: 9h - 12h</li>
              <li>Domingo: Fechado</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 Estúdio Pedra Industrial. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
