/*
  Estúdio Pedra Industrial - Página Home
  Design: Minimalista sofisticado, elegante, premium
  Foco em aço carbono e MDF
*/

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Hammer, Leaf, Truck, Award, Sparkles, Target, Heart } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { WHATSAPP_LINK } from "@/lib/whatsapp";
import { Link } from "wouter";
import { ProductCard } from "@/components/catalog/ProductCard";
import { AmbientesStrip } from "@/components/home/AmbientesStrip";
import { selectFeatured } from "@/lib/featured";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const { data: products = [] } = trpc.products.list.useQuery();
  const featured = selectFeatured(products);
  return (
    <Layout showCart>

      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container">

          <div className="flex flex-col md:flex-row items-center gap-12 mb-12">
            <div className="flex-1">
              <h1 className="text-4xl sm:text-5xl md:text-6xl heading-display text-foreground mb-8 leading-tight">
                Móveis industriais personalizados
              </h1>
            </div>
            <div className="flex-shrink-0 hidden md:block">
              <img 
                src="/logo.png" 
                alt="Estúdio Pedra Industrial Logo"
                className="w-full max-w-sm h-auto object-contain"
              />
            </div>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mb-12 leading-relaxed">
            Aqui, a criatividade guia cada detalhe. Exploramos materiais, formas e processos de maneira autoral, transformando ideias em soluções sob medida. 

Nossa criatividade está em unir estética industrial, funcionalidade e inovação em cada projeto.
          </p>
          <div className="flex flex-col md:flex-row gap-6">
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
              <Button 
                className="bg-foreground text-background hover:bg-secondary text-sm px-8 py-3 rounded heading-secondary transition-all duration-300 inline-flex items-center gap-2 w-fit"
              >
                fazer um orçamento
                <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
            <a href="/catalogo">
              <Button 
                variant="outline"
                className="border border-foreground/30 hover:border-foreground hover:bg-foreground/5 text-foreground heading-secondary text-sm px-8 py-3 rounded transition-all duration-300 w-fit"
              >
                VER PORTFÓLIO
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Destaques */}
      {featured.length > 0 && (
        <section className="py-20 bg-background border-t border-border">
          <div className="container">
            <div className="mb-12">
              <div className="inline-block mb-6 px-4 py-1 border border-foreground/30 rounded">
                <span className="text-accent-mono text-foreground text-xs">PORTFÓLIO</span>
              </div>
              <h2 className="text-5xl sm:text-6xl md:text-7xl heading-display text-foreground">
                Destaques
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            <div className="mt-12 text-center">
              <Link href="/catalogo">
                <Button
                  variant="outline"
                  className="border border-foreground/30 hover:border-foreground hover:bg-foreground/5 text-foreground heading-secondary text-sm px-8 py-3 rounded transition-all duration-300"
                >
                  Ver portfólio completo
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-20 bg-card">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Hammer, title: "Artesanal", description: "Fabricação precisa e cuidadosa em cada detalhe" },
              { icon: Leaf, title: "Sustentável", description: "Materiais responsáveis e processos eco-friendly" },
              { icon: Truck, title: "Entrega", description: "Logística segura para todo o Brasil" },
              { icon: Award, title: "Garantia", description: "Garantia do produto por 3 meses" },
            ].map((feature, idx) => (
              <div key={idx} className="flex flex-col items-center text-center">
                <div className="mb-4 w-12 h-12 bg-foreground flex items-center justify-center rounded">
                  <feature.icon className="w-6 h-6 text-background" />
                </div>
                <h3 className="heading-secondary text-sm mb-2 text-foreground uppercase">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AmbientesStrip />

      {/* Services Section */}
      <section id="servicos" className="py-32 bg-background">
        <div className="container">
          <div className="mb-20">
            <div className="inline-block mb-6 px-4 py-1 border border-foreground/30 rounded">
              <span className="text-accent-mono text-foreground text-xs">SERVIÇOS</span>
            </div>
            <h2 className="text-5xl sm:text-6xl md:text-7xl heading-display text-foreground mb-6">
              Nossos Serviços
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Soluções completas em mobiliário industrial, reforma e projetos personalizados
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                title: "Estilo Industrial",
                description: "Projetamos e fabricamos peças no estilo industrial com aço carbono.",
                icon: Hammer,
                color: "from-secondary/20 to-transparent",
                link: "/catalogo"
              },
              {
                title: "Reforma de Móveis",
                description: "Reformamos móveis antigos e deteriorados com reconstituição em ferro.",
                icon: Truck,
                color: "from-secondary/20 to-transparent"
              },
              {
                title: "Projetos Personalizados",
                description: "Criamos peças sob medida de forma personalizada. Entre em contato com a gente!",
                icon: Sparkles,
                color: "from-secondary/20 to-transparent"
              },
            ].map((service, idx) => (
              <div 
                key={idx} 
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-secondary/10 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-8 rounded-lg border border-border hover:border-foreground/30 transition-all duration-300">
                  <div className="mb-6 w-16 h-16 bg-foreground flex items-center justify-center rounded group-hover:bg-secondary transition-colors duration-300">
                    <service.icon className="w-8 h-8 text-background" />
                  </div>
                  <h3 className="heading-secondary text-2xl mb-4 text-foreground">
                    {service.title}
                  </h3>
                  <p className="text-base text-muted-foreground leading-relaxed mb-6">
                    {service.description}
                  </p>
                  {service.link ? (
                    <Link href={service.link}>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border border-foreground/30 hover:border-foreground hover:bg-foreground/5 text-foreground heading-secondary text-xs rounded transition-all duration-300"
                      >
                        Saiba Mais
                      </Button>
                    </Link>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border border-foreground/30 hover:border-foreground hover:bg-foreground/5 text-foreground heading-secondary text-xs rounded transition-all duration-300"
                    >
                      Saiba Mais
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="sobre" className="py-32 bg-card">
        <div className="container max-w-4xl">
          <div className="mb-12">
            <div className="inline-block mb-6 px-4 py-1 border border-foreground/30 rounded">
              <span className="text-accent-mono text-foreground text-xs">NOSSA HISTÓRIA</span>
            </div>
            <h2 className="text-5xl sm:text-6xl md:text-7xl heading-display text-foreground mb-8">
              Precisão e elegância
            </h2>
          </div>
          <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
            <p>
              O <strong className="text-foreground">Estúdio Pedra Industrial</strong> nasce do encontro entre matéria-prima, técnica e olhar sensível para o design. Somos um estúdio criativo dedicado à produção de móveis industriais sob medida, onde cada peça é pensada para ir além da funcionalidade e se tornar parte da história de quem a escolhe.
            </p>
            <p>
              Trabalhamos principalmente com aço carbono e MDF, materiais que, em nossas mãos, ganham equilíbrio, leveza e sofisticação. Nossa trajetória é marcada pela valorização do fazer manual, pela atenção aos detalhes e pelo cuidado em cada etapa do processo: da concepção do projeto à escolha dos materiais, da solda precisa ao acabamento final.
            </p>
            <p>
              Cada móvel é desenvolvido de forma personalizada, respeitando o espaço, o uso e o estilo de cada cliente. Mais do que produzir móveis, criamos peças autorais que definem espaços, traduzem personalidade e elevam a experiência do dia a dia. No Estúdio Pedra Industrial, o design é pensado para durar, em estética e qualidade.
            </p>
          </div>

        </div>
      </section>

      {/* Mission, Vision, Values Section */}
      <section className="py-32 bg-background">
        <div className="container">
          <div className="mb-20">
            <div className="inline-block mb-6 px-4 py-1 border border-foreground/30 rounded">
              <span className="text-accent-mono text-foreground text-xs">PILARES</span>
            </div>
            <h2 className="text-5xl sm:text-6xl md:text-7xl heading-display text-foreground">
              Missão, Visão e Valores
            </h2>
          </div>

          {/* Mission */}
          <div className="mb-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Missão */}
              <div className="group">
                <div className="mb-6 w-16 h-16 bg-foreground flex items-center justify-center rounded group-hover:bg-secondary transition-colors duration-300">
                  <Target className="w-8 h-8 text-background" />
                </div>
                <h3 className="heading-secondary text-lg mb-4 text-foreground">Missão</h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  Tornar o estilo industrial mais conhecido, desejado e apreciado, criando móveis sob medida que unem sofisticação, funcionalidade e autenticidade. Transformamos espaços em experiências com identidade.
                </p>
              </div>

              {/* Visão */}
              <div className="group">
                <div className="mb-6 w-16 h-16 bg-foreground flex items-center justify-center rounded group-hover:bg-secondary transition-colors duration-300">
                  <Sparkles className="w-8 h-8 text-background" />
                </div>
                <h3 className="heading-secondary text-lg mb-4 text-foreground">Visão</h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  Ser referência em mobiliário industrial personalizado, transformando projetos em identidade e móveis em expressão de personalidade.
                </p>
              </div>

              {/* Valores intro */}
              <div className="group">
                <div className="mb-6 w-16 h-16 bg-foreground flex items-center justify-center rounded group-hover:bg-secondary transition-colors duration-300">
                  <Heart className="w-8 h-8 text-background" />
                </div>
                <h3 className="heading-secondary text-lg mb-4 text-foreground">Valores</h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  Personalidade, Cuidado e Criatividade são os pilares que guiam cada projeto e definem nossa identidade.
                </p>
              </div>
            </div>
          </div>

          {/* Values Details */}
          <div className="mt-24 pt-24 border-t border-border">
            <h3 className="text-3xl heading-display text-foreground mb-12">Nossos Valores em Detalhes</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                {
                  icon: Sparkles,
                  title: "Personalidade",
                  description: "Criamos móveis com alma. Cada peça carrega identidade, história e propósito, refletindo o estilo de quem escolhe o Estúdio Pedra Industrial."
                },
                {
                  icon: Heart,
                  title: "Cuidado",
                  description: "Atendemos de forma próxima, focando na produção artesanal e atenção aos detalhes em cada etapa. Do projeto à entrega."
                },
                {
                  icon: Target,
                  title: "Criatividade",
                  description: "Desenvolvemos soluções criativas que combinam design inovador, técnica e funcionalidade em projetos personalizados."
                }
              ].map((value, idx) => (
                <div key={idx} className="group">
                  <div className="mb-6 w-14 h-14 bg-secondary flex items-center justify-center rounded group-hover:bg-foreground transition-colors duration-300">
                    <value.icon className="w-7 h-7 text-foreground group-hover:text-background transition-colors duration-300" />
                  </div>
                  <h4 className="heading-secondary text-lg mb-4 text-foreground">{value.title}</h4>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-foreground">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-5xl sm:text-6xl md:text-7xl heading-display text-background mb-8">
              Transforme seu espaço
            </h2>
            <p className="text-lg text-background/80 mb-12">
              Converse com nossos especialistas sobre projetos customizados e soluções personalizadas para seu ambiente
            </p>
            <div className="flex flex-col md:flex-row gap-6 justify-center">
              <a href="/catalogo">
                <Button 
                  className="bg-background text-foreground hover:bg-secondary text-sm px-8 py-3 rounded heading-secondary transition-all duration-300"
                >
                  Ver portfólio
                </Button>
              </a>
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                <Button 
                  variant="outline"
                  className="border border-background text-background hover:bg-background/10 text-sm px-8 py-3 rounded heading-secondary transition-all duration-300"
                >
                  Solicitar Orçamento
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

    </Layout>
  );
}
