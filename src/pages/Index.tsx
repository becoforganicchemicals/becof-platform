import Layout from "@/components/layout/Layout";
import HeroSection from "@/components/home/HeroSection";
import WhatWeDo from "@/components/home/WhatWeDo";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import PlatformHighlights from "@/components/home/PlatformHighlights";
import ImpactSnapshot from "@/components/home/ImpactSnapshot";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import FinalCTA from "@/components/home/FinalCTA";

const Index = () => (
  <Layout>
    <HeroSection />
    <WhatWeDo />
    <FeaturedProducts />
    <PlatformHighlights />
    <ImpactSnapshot />
    <TestimonialsSection />
    <FinalCTA />
  </Layout>
);

export default Index;
