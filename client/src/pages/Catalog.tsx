/*
  Estúdio Pedra Industrial - Página Portfólio
  Design: Minimalista sofisticado, elegante, premium
  Foco em aço carbono e MDF
*/

import { ArrowLeft, Plus, X, ChevronLeft, ChevronRight, Tag } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Layout } from "@/components/layout/Layout";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { QuoteButton } from "@/components/catalog/QuoteButton";
import { CARD_SIZES, ResponsiveImage } from "@/components/ResponsiveImage";
import { hasDimensions, thumbUrl } from "@/lib/imageSrcSet";

export default function Catalog() {
  const { data: products = [] } = trpc.products.list.useQuery();

  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const openGallery = (productId: number) => {
    const product = products.find(p => p.id === productId);
    if (product && product.images.length > 0) {
      setSelectedProduct(productId);
      setCurrentImageIndex(0);
    }
  };

  const closeGallery = () => {
    setSelectedProduct(null);
    setCurrentImageIndex(0);
  };

  const nextImage = () => {
    if (selectedProduct) {
      const product = products.find(p => p.id === selectedProduct);
      if (product) {
        setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
      }
    }
  };

  const prevImage = () => {
    if (selectedProduct) {
      const product = products.find(p => p.id === selectedProduct);
      if (product) {
        setCurrentImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
      }
    }
  };

  const currentProduct = selectedProduct ? products.find(p => p.id === selectedProduct) : null;
  const currentImage = currentProduct?.images[currentImageIndex];
  const knownSize = currentImage ? hasDimensions(currentImage) : false;

  return (
  <Layout showCart>

      {/* Catalog Header */}
      <section className="py-20 bg-background border-b border-border">
        <div className="container">
          <div className="mb-8">
            <Link href="/">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300 cursor-pointer">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </div>
            </Link>
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl heading-display text-foreground mb-6">
            Portfólio de Produtos
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Explore nossa coleção completa de móveis industriais.
            <br />
            <br />
            Para além dos produtos existentes neste portfólio, fazemos projetos personalizados sob medida. Entre em contato conosco!
          </p>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-32 bg-background">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {products.map((product) => (
              <div 
                key={product.id}
                className="group border border-border rounded-lg overflow-hidden hover:border-foreground/50 transition-all duration-300"
              >
                {/* Image Area */}
                <div 
                  className="relative h-64 bg-card flex items-center justify-center overflow-hidden cursor-pointer group/image-area"
                  onClick={() => product.images.length > 0 && openGallery(product.id)}
                >
                  {product.images.length > 0 ? (
                    <>
                      {/* Main Image */}
                      <ResponsiveImage
                        image={product.images[0]}
                        sizes={CARD_SIZES}
                        alt={`${product.name} principal`}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover/image-area:opacity-80 transition-opacity duration-300"
                      />

                      {/* Image Count Badge */}
                      <div className="absolute top-4 right-4 bg-foreground/90 text-background px-3 py-1 rounded-full text-xs font-semibold">
                        {product.images.length} foto{product.images.length !== 1 ? 's' : ''}
                      </div>

                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover/image-area:bg-black/30 transition-all duration-300 flex items-center justify-center">
                        <p className="text-white text-sm font-semibold opacity-0 group-hover/image-area:opacity-100 transition-opacity duration-300">
                          Ver galeria ({product.images.length})
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <Plus className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Sem fotos</p>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-8">
                  <h3 className="heading-secondary text-xl mb-2 text-foreground">
                    {product.name}
                  </h3>
                  <p className={`text-sm text-muted-foreground leading-relaxed ${product.category ? "mb-2" : "mb-4"}`}>
                    {product.description}
                  </p>

                  {product.category ? (
                    <span className="mt-1 mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Tag className="h-3 w-3" />
                      {product.category}
                    </span>
                  ) : null}

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <QuoteButton productName={product.name} />
                    <AddToCartButton name={product.name} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Modal */}
      {selectedProduct && currentProduct && currentImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
          {/* Close Button */}
          <button
            onClick={closeGallery}
            className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Main Image */}
          <div className="relative w-full max-w-4xl mb-8">
            <div
              className={knownSize ? "mx-auto max-h-[70vh] w-full" : undefined}
              style={knownSize ? { aspectRatio: `${currentImage.width} / ${currentImage.height}` } : undefined}
            >
              <img
                src={currentImage.url}
                alt={`${currentProduct.name} ${currentImageIndex + 1}`}
                width={knownSize ? currentImage.width : undefined}
                height={knownSize ? currentImage.height : undefined}
                className={knownSize ? "h-full w-full object-contain" : "w-full h-auto max-h-96 object-contain"}
              />
            </div>
            
            {/* Navigation Arrows */}
            {currentProduct.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 text-white hover:text-gray-300 transition-colors"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 text-white hover:text-gray-300 transition-colors"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}

            {/* Image Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
              Imagem {currentImageIndex + 1} de {currentProduct.images.length}
            </div>
          </div>

          {/* Thumbnails */}
          {currentProduct.images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-4 w-full max-w-4xl">
              {currentProduct.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`flex-shrink-0 w-20 h-20 rounded border-2 transition-all ${
                    idx === currentImageIndex
                      ? 'border-white'
                      : 'border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <img
                    src={thumbUrl(img)}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover rounded"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
  </Layout>
  );
}
