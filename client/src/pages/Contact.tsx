/*
  Estúdio Pedra Industrial - Página de Contato
  Design: Minimalista sofisticado, elegante, premium
  Foco em informações de contato direto
*/

import { MessageCircle, Instagram } from "lucide-react";
import { Link } from "wouter";

export default function Contact() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header/Navigation */}
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="container">
          <nav className="flex items-center justify-between py-6">
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="Estúdio Pedra Industrial Logo"
                className="w-12 h-12 object-contain"
              />
              <div>
                <p className="heading-secondary text-sm font-bold text-foreground">Estúdio Pedra</p>
                <p className="text-xs text-accent-mono text-muted-foreground">INDUSTRIAL</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-12">
              <a href="/" className="heading-secondary text-sm text-foreground hover:text-secondary transition-colors duration-300">
                Início
              </a>
              <a href="/#servicos" className="heading-secondary text-sm text-foreground hover:text-secondary transition-colors duration-300">
                Serviços
              </a>
              <a href="/#sobre" className="heading-secondary text-sm text-foreground hover:text-secondary transition-colors duration-300">
                Sobre
              </a>
              <a href="/contato" className="heading-secondary text-sm text-foreground hover:text-secondary transition-colors duration-300">
                Contato
              </a>
              <a href="/catalogo" className="heading-secondary text-sm text-foreground hover:text-secondary transition-colors duration-300">
                Portfólio
              </a>
              <a href="https://wa.me/5531971803551" target="_blank" rel="noopener noreferrer">
                <button 
                  className="bg-foreground text-background hover:bg-secondary text-sm px-6 py-2 rounded heading-secondary transition-all duration-300 flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Faça um Orçamento
                </button>
              </a>
            </div>
          </nav>
        </div>
      </header>

      {/* Contact Section */}
      <section className="py-32 md:py-48 bg-background">
        <div className="container max-w-2xl">
          <div className="mb-16">
            <div className="inline-block mb-6 px-4 py-1 border border-foreground/30 rounded">
              <span className="text-accent-mono text-foreground text-xs">CONTATO</span>
            </div>
            <h1 className="text-6xl md:text-7xl heading-display text-foreground mb-8 leading-tight">
              Entre em contato conosco para saber mais!
            </h1>
          </div>

          {/* Contact Methods */}
          <div className="space-y-8">
            {/* WhatsApp */}
            <div className="group relative">
              <a href="https://wa.me/5531971803551" target="_blank" rel="noopener noreferrer">
                <div className="p-8 rounded-lg border border-border hover:border-foreground/30 transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-foreground flex items-center justify-center rounded group-hover:bg-secondary transition-colors duration-300">
                      <MessageCircle className="w-8 h-8 text-background" />
                    </div>
                    <div>
                      <h3 className="heading-secondary text-2xl text-foreground mb-2">
                        WhatsApp
                      </h3>
                      <p className="text-lg text-secondary hover:text-foreground transition-colors duration-300">
                        (31) 97180-3551
                      </p>
                    </div>
                  </div>
                </div>
              </a>
            </div>

            {/* Instagram */}
            <div className="group relative">
              <a href="https://instagram.com/estudio.pedraindustrial" target="_blank" rel="noopener noreferrer">
                <div className="p-8 rounded-lg border border-border hover:border-foreground/30 transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-foreground flex items-center justify-center rounded group-hover:bg-secondary transition-colors duration-300">
                      <Instagram className="w-8 h-8 text-background" />
                    </div>
                    <div>
                      <h3 className="heading-secondary text-2xl text-foreground mb-2">
                        Instagram
                      </h3>
                      <p className="text-lg text-secondary hover:text-foreground transition-colors duration-300">
                        @estudio.pedraindustrial
                      </p>
                    </div>
                  </div>
                </div>
              </a>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-20 p-8 rounded-lg bg-card border border-border">
            <h3 className="heading-secondary text-xl text-foreground mb-4">
              Horário de Atendimento
            </h3>
            <div className="space-y-2 text-muted-foreground">
              <p>Segunda a Sexta: 8h - 18h</p>
              <p>Sábado: 9h - 12h</p>
              <p>Domingo: Fechado</p>
            </div>
          </div>

          {/* Back Button */}
          <div className="mt-12">
            <Link href="/">
              <button className="heading-secondary text-sm text-foreground hover:text-secondary transition-colors duration-300 underline">
                ← Voltar para o início
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <h4 className="heading-secondary text-sm mb-6 text-foreground">Sobre</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="/#sobre" className="hover:text-foreground transition-colors">Nossa História</a></li>
                <li><a href="/#servicos" className="hover:text-foreground transition-colors">Serviços</a></li>
                <li><a href="/catalogo" className="hover:text-foreground transition-colors">Portfólio</a></li>
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
            <div>
              <h4 className="heading-secondary text-sm mb-6 text-foreground">Redes Sociais</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="https://instagram.com/estudio.pedraindustrial" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Instagram</a></li>
                <li><a href="https://wa.me/5531971803551" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">WhatsApp</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-6 md:mb-0">
              <img 
                src="/logo.png" 
                alt="Estúdio Pedra Industrial Logo"
                className="w-10 h-10 object-contain"
              />
              <p className="text-sm text-muted-foreground">© 2026 Estúdio Pedra Industrial. Todos os direitos reservados.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
