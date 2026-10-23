import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Layout from "@/components/layout/Layout";
import SEO from "@/components/SEO";
import { CROP_PROGRAMMES } from "@/lib/cropProgrammes";
import { breadcrumbSchema, SITE_URL } from "@/lib/structuredData";
import { LITRES_PER_ACRE, WATER_LITRES_PER_ACRE } from "@/lib/packs";

const Crops = () => (
  <Layout>
    <SEO
      title="Shop by Crop"
      description="Find the right Becof organic biofertilizers for maize, potatoes and vegetables: which products to use, when to apply them, and how much you need per acre."
      url={`${SITE_URL}/crops`}
      jsonLd={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Crop guides", path: "/crops" }])}
    />
    <section className="py-12">
      <div className="container max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Shop by crop</h1>
        <p className="text-lg text-muted-foreground mb-10">
          Choose your crop to see which Becof products to use, when to apply them, and exactly how much you need for
          your farm. Every application is {LITRES_PER_ACRE} L per acre, mixed with {WATER_LITRES_PER_ACRE} L of water.
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          {CROP_PROGRAMMES.map((crop) => (
            <Link
              key={crop.slug}
              to={`/crops/${crop.slug}`}
              className="group rounded-xl border border-border bg-card p-6 hover:border-primary hover:shadow-md transition-all"
            >
              <h2 className="text-xl font-semibold mb-2 group-hover:text-primary">{crop.name}</h2>
              <p className="text-sm text-muted-foreground mb-4">
                {crop.steps.length} products · {crop.crops ?? `the complete ${crop.name.toLowerCase()} programme`}
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                View programme <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  </Layout>
);

export default Crops;
