/*
  Estúdio Pedra Industrial - Página de Contato
  Design: Minimalista sofisticado, elegante, premium
  Foco em informações de contato direto
*/

import { MessageCircle, Instagram } from "lucide-react";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { WHATSAPP_LINK } from "@/lib/whatsapp";

export default function Contact() {
  return (
    <Layout>

      {/* Contact Section */}
      <section className="py-32 md:py-48 bg-background">
        <div className="container max-w-2xl">
          <div className="mb-16">
            <div className="inline-block mb-6 px-4 py-1 border border-foreground/30 rounded">
              <span className="text-accent-mono text-foreground text-xs">CONTATO</span>
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl heading-display text-foreground mb-8 leading-tight">
              Entre em contato conosco para saber mais!
            </h1>
          </div>

          {/* Contact Methods */}
          <div className="space-y-8">
            {/* WhatsApp */}
            <div className="group relative">
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
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

    </Layout>
  );
}
