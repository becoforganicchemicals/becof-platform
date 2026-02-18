import Layout from "@/components/layout/Layout";
import HeroSection from "@/components/home/HeroSection";
import WhatWeDo from "@/components/home/WhatWeDo";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import PlatformHighlights from "@/components/home/PlatformHighlights";
import ImpactSnapshot from "@/components/home/ImpactSnapshot";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import FinalCTA from "@/components/home/FinalCTA";
import SEO from "@/components/SEO";

const Index = () => (
  <Layout>
    <SEO
      title="Sustainable Agricultural Solutions"
      description="Becof Organic Chemicals provides sustainable, eco-friendly agricultural solutions for farmers across Kenya and beyond. Discover our range of organic fertilizers, pesticides, and soil amendments."
      url="https://www.becoforganicchemicals.com"
    />
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
