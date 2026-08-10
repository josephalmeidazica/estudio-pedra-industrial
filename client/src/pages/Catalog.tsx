/*
  Estúdio Pedra Industrial - Página Portfólio
  Design: Minimalista sofisticado, elegante, premium
  Foco em aço carbono e MDF
*/

import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

export default function Catalog() {
  const [products, setProducts] = useState([
    {
      id: "estrutura-gaia",
      name: "Estrutura Gaia",
      description: "Estrutura modular que se adapta a qualquer espaço",
      images: [] as any[]
    },
    {
      id: "estante-divisio",
      name: "Estante Divisio",
      description: "Estante modular em aço carbono e MDF que divide espaços com elegância",
      images: [] as any[]
    },
    {
      id: "luminaria-lua",
      name: "Luminária Lua",
      description: "Luminária artesanal que traz a serenidade da lua para seus ambientes",
      images: [] as any[]
    },
    {
      id: "luminaria-sol",
      name: "Luminária Sol",
      description: "Luminária que aquece e ilumina com a energia do sol",
      images: [] as any[]
    },
    {
      id: "mesa-cabeceira-loft",
      name: "Mesa de Cabeceira Loft",
      description: "Minimalismo, força e identidade urbana. Opções com gaveta e gaveta + nicho",
      images: [] as any[]
    },
    {
      id: "mesa-office-l",
      name: "Mesa Office L",
      description: "Mesa de escritório em formato L, perfeita para home office",
      images: [] as any[]
    },
    {
      id: "mesa-urb",
      name: "Mesa Urb",
      description: "Mesa urbana em aço carbono com design contemporâneo",
      images: [] as any[]
    },
    {
      id: "penteadeira-glam",
      name: "Penteadeira Glam",
      description: "Penteadeira sofisticada que combina funcionalidade e elegância",
      images: [] as any[]
    },
    {
      id: "projetos-personalizados",
      name: "Projetos Personalizados",
      description: "Crie seu próprio móvel sob medida com nossa equipe",
      images: [] as any[]
    },
  ]);

  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [uploadingProduct, setUploadingProduct] = useState<string | null>(null);

  // tRPC queries and mutations
  const { data: allImages } = trpc.products.getAllImages.useQuery();
  const addImageMutation = trpc.products.addImage.useMutation();
  const deleteImageMutation = trpc.products.deleteImage.useMutation();
  const { data: productImages } = trpc.products.getImages.useQuery(
    { productName: selectedProduct || "" },
    { enabled: !!selectedProduct }
  );

  // Load images from database on mount
  useEffect(() => {
    if (allImages) {
      const groupedImages = allImages.reduce((acc, img) => {
        const product = products.find(p => p.name === img.productName);
        if (product) {
          const productIndex = products.findIndex(p => p.name === img.productName);
          if (productIndex !== -1) {
            acc[productIndex] = [...(acc[productIndex] || []), img];
          }
        }
        return acc;
      }, {} as Record<number, any[]>);

      setProducts(products.map((p, idx) => ({
        ...p,
        images: groupedImages[idx] || []
      })));
    }
  }, [allImages]);

  // Compress image to reduce file size
  const compressImage = (dataUrl: string, quality: number = 0.6): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);
        
        // Resize if too large
        let width = img.width;
        let height = img.height;
        const maxWidth = 1200;
        const maxHeight = 1200;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        const compressedUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedUrl);
      };
      img.src = dataUrl;
    });
  };

  const handleImageUpload = async (productId: string, files: FileList) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setUploadingProduct(productId);

    Array.from(files).forEach(async (file) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        if (e.target?.result) {
          let imageUrl = e.target.result as string;
          
          // Compress image to reduce size
          imageUrl = await compressImage(imageUrl, 0.5);
          
          try {
            // Save to database
            await addImageMutation.mutateAsync({
              productName: product.name,
              imageUrl: imageUrl
            });

            // Update local state
            setProducts(products.map(p => 
              p.id === productId 
                ? { ...p, images: [...p.images, { imageUrl, productName: product.name }] }
                : p
            ));
          } catch (error) {
            console.error('Erro ao salvar imagem:', error);
            // Try with more compression
            imageUrl = await compressImage(imageUrl, 0.3);
            try {
              await addImageMutation.mutateAsync({
                productName: product.name,
                imageUrl: imageUrl
              });
              setProducts(products.map(p => 
                p.id === productId 
                  ? { ...p, images: [...p.images, { imageUrl, productName: product.name }] }
                  : p
              ));
            } catch (err) {
              console.error('Erro mesmo com compressão extra:', err);
              alert('Erro ao salvar imagem. Tente com uma imagem menor.');
            }
          }
        }
      };
      reader.readAsDataURL(file);
    });

    setUploadingProduct(null);
  };

  const removeImage = async (productId: string, imageId: number) => {
    // Delete from database
    await deleteImageMutation.mutateAsync({ imageId });

    // Update local state
    setProducts(products.map(p =>
      p.id === productId
        ? { ...p, images: p.images.filter((img) => img.id !== imageId) }
        : p
    ));
  };

  const handleAddPhotosClick = (productId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        handleImageUpload(productId, files);
      }
    };
    input.click();
  };

  const openGallery = (productId: string) => {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="container">
          <nav className="flex items-center justify-between py-6">
            <Link href="/">
              <div className="flex items-center gap-3 hover:opacity-80 transition-opacity duration-300 cursor-pointer">
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
            </Link>
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
              <a href="/#contato" className="heading-secondary text-sm text-foreground hover:text-secondary transition-colors duration-300">
                Contato
              </a>
            </div>
          </nav>
        </div>
      </header>

      {/* Catalog Header */}
      <section className="py-20 bg-background border-b border-border">
        <div className="container">
          <Link href="/">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300 mb-8 cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </div>
          </Link>
          <h1 className="text-6xl md:text-7xl heading-display text-foreground mb-6">
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
                      <img 
                        src={product.images[0].imageUrl} 
                        alt={`${product.name} principal`}
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
                      
                      {/* Remove Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(product.id, product.images[0].id);
                        }}
                        className="absolute top-4 left-4 bg-red-500/90 hover:bg-red-600 text-white p-2 rounded opacity-0 group-hover/image-area:opacity-100 transition-opacity duration-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
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
                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                    {product.description}
                  </p>

                  {/* Add Photos Button */}
                  <Button
                    onClick={() => handleAddPhotosClick(product.id)}
                    disabled={uploadingProduct === product.id}
                    className="w-full bg-foreground text-background hover:bg-secondary text-sm px-4 py-2 rounded heading-secondary transition-all duration-300"
                  >
                    {uploadingProduct === product.id ? 'Enviando...' : product.images.length > 0 ? 'Adicionar Mais' : 'Adicionar Fotos'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Modal */}
      {selectedProduct && currentProduct && currentProduct.images.length > 0 && (
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
            <img
              src={currentProduct.images[currentImageIndex].imageUrl}
              alt={`${currentProduct.name} ${currentImageIndex + 1}`}
              className="w-full h-auto max-h-96 object-contain"
            />
            
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
                    src={img.imageUrl}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover rounded"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
