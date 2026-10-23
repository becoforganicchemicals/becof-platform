import CropButtons from "@/components/CropButtons";

// Homepage: send farmers straight to the programme for their crop.
const ShopByCrop = () => (
  <section className="py-16 bg-muted/30">
    <div className="container">
      <div className="mb-8">
        <span className="inline-block px-3 py-1 text-xs font-semibold tracking-widest uppercase text-secondary bg-secondary/10 rounded-full mb-3">
          Shop by crop
        </span>
        <h2 className="text-3xl md:text-4xl font-bold mb-2">What are you growing?</h2>
        <p className="text-muted-foreground">
          See which products to use, when to apply them, and exactly how much you need for your farm.
        </p>
      </div>
      <CropButtons title={null} />
    </div>
  </section>
);

export default ShopByCrop;
