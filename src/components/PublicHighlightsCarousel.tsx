import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { Button } from "@/components/ui/button";
import { BookOpen, Landmark, Calculator, ExternalLink, ScrollText, Scale } from "lucide-react";

const slides = [
  {
    href: "/codigo-penal",
    icon: BookOpen,
    tag: "Documento Oficial",
    title: "Código Penal Integrado",
    desc: (<>Consulte a íntegra dos artigos penais vigentes na Comarca, com tipificação, <strong className="text-gold">pena</strong>, <strong className="text-gold">multa</strong> e <strong className="text-gold">fiança</strong>.</>),
    cta: "Acessar Código Penal",
    path: "/codigo-penal",
  },
  {
    href: "/ordenamento",
    icon: Landmark,
    tag: "Legislação Vigente",
    title: "Ordenamento Jurídico Federal",
    desc: (<>Constituição, <strong className="text-gold">Decretos-Lei</strong>, Códigos e normas institucionais da República Federativa de Jaguaré em um único acervo público.</>),
    cta: "Consultar Ordenamento",
    path: "/ordenamento",
  },
  {
    href: "/calculadora",
    icon: Calculator,
    tag: "Ferramenta Pública",
    title: "Calculadora de Custas",
    desc: (<>Estime <strong className="text-gold">penas</strong>, <strong className="text-gold">multas</strong> e <strong className="text-gold">custas processuais</strong> conforme o Código Penal e Decretos-Lei vigentes.</>),
    cta: "Abrir Calculadora",
    path: "/calculadora",
  },
];

export default function PublicHighlightsCarousel() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  return (
    <div className="relative">
      <Carousel
        setApi={setApi}
        opts={{ loop: true, align: "start" }}
        plugins={[Autoplay({ delay: 6000, stopOnInteraction: true })]}
        className="w-full"
      >
        {/* Peek next slide on mobile via basis < 100% + horizontal padding */}
        <CarouselContent className="-ml-3">
          {slides.map((slide, i) => (
            <CarouselItem key={slide.href} className="pl-3 basis-[92%] sm:basis-full">
              <motion.a
                href={slide.href}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="flex h-[300px] sm:h-[260px] md:h-[240px] relative overflow-hidden rounded-2xl border-2 border-gold/60 bg-gradient-to-br from-institutional-dark via-institutional to-institutional-dark p-6 sm:p-8 lg:p-10 shadow-2xl shadow-gold/20 hover:border-gold hover:shadow-gold/40 transition-all group"
              >
                <div className="absolute -top-12 -right-12 w-64 h-64 bg-gold/15 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-1/3 w-96 h-32 bg-gold/10 rounded-full blur-2xl" />
                <div className="absolute top-3 right-4 text-[10px] font-mono text-gold/60">
                  {String(i + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-5 md:gap-6 h-full">
                  <div className="bg-gold/20 rounded-2xl p-4 sm:p-5 border border-gold/30 shadow-lg flex-shrink-0">
                    <slide.icon className="h-12 w-12 sm:h-14 sm:w-14 text-gold" />
                  </div>
                  <div className="flex-1 text-center md:text-left min-w-0">
                    <span className="text-[10px] uppercase tracking-[0.25em] text-gold font-bold">{slide.tag}</span>
                    <h3 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-sidebar-foreground mt-1 leading-tight">
                      {slide.title}
                    </h3>
                    <p className="text-sidebar-foreground/70 text-sm lg:text-base mt-2 max-w-2xl">
                      {slide.desc} Acesso público — sem necessidade de login.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0 w-full md:w-auto">
                    <Button className="rounded-xl h-11 sm:h-12 px-6 sm:px-8 bg-gold hover:bg-gold-light text-institutional-dark font-bold whitespace-nowrap group-hover:scale-105 transition-transform w-full md:w-auto">
                      {slide.cta}
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                    <span className="text-[10px] text-sidebar-foreground/40 text-center font-mono">
                      {slide.path}
                    </span>
                  </div>
                </div>
              </motion.a>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex -left-3 bg-institutional border-gold/50 text-gold hover:bg-gold hover:text-institutional-dark" />
        <CarouselNext className="hidden sm:flex -right-3 bg-institutional border-gold/50 text-gold hover:bg-gold hover:text-institutional-dark" />
      </Carousel>

      {/* Dots indicator */}
      <div className="flex items-center justify-center gap-2 mt-4">
        {Array.from({ length: count }).map((_, i) => (
          <button
            key={i}
            onClick={() => api?.scrollTo(i)}
            aria-label={`Ir para destaque ${i + 1}`}
            className={`transition-all rounded-full ${
              current === i
                ? "w-8 h-2 bg-gold"
                : "w-2 h-2 bg-gold/30 hover:bg-gold/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
