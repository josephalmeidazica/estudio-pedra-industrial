/*
  Estúdio Pedra Industrial - Página Home
  Lista de seções; o conteúdo vem de shared/content.
*/

import { Layout } from "@/components/layout/Layout";
import { Avaliacoes } from "@/components/home/Avaliacoes";
import { ChamadaFinal } from "@/components/home/ChamadaFinal";
import { ComoFunciona } from "@/components/home/ComoFunciona";
import { Experiencia } from "@/components/home/Experiencia";
import { InstagramFeed } from "@/components/home/InstagramFeed";
import { Destaques } from "@/components/home/Destaques";
import { Diferenciais } from "@/components/home/Diferenciais";
import { Hero } from "@/components/home/Hero";
import { Servicos } from "@/components/home/Servicos";
import { trpc } from "@/lib/trpc";
import { usePageTitle } from "@/lib/usePageTitle";
import { titles } from "@shared/seo-text";

export default function Home() {
  usePageTitle(titles.home());
  const { data: products = [] } = trpc.products.list.useQuery();
  return (
    <Layout showCart>
      <Hero />
      <Diferenciais />
      <Servicos products={products} />
      <Destaques products={products} />
      <ComoFunciona />
      <Experiencia />
      <InstagramFeed />
      <Avaliacoes />
      <ChamadaFinal />
    </Layout>
  );
}
