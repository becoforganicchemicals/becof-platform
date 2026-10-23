import { useState } from "react";
import { Calculator, Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/contexts/CartContext";
import { formatKes } from "@/lib/delivery";
import {
  bestPackPlan, formatLitres, LITRES_PER_ACRE, litresForArea, sortPacks, WATER_LITRES_PER_ACRE, type PackSize,
} from "@/lib/packs";
import { programmesForProduct } from "@/lib/cropProgrammes";

interface Props {
  product: { id: string; slug: string; name: string; stock_quantity: number };
  packs: PackSize[];
}

// "How much do I need?" for one product: farm size × applications → litres
// → the cheapest pack combination, added to the cart in one click.
const PackCalculator = ({ product, packs }: Props) => {
  const { addPacksToCart } = useCart();
  const crops = programmesForProduct(product.slug);
  const [cropSlug, setCropSlug] = useState(crops[0]?.crop.slug ?? "");
  const [acres, setAcres] = useState("");
  const selected = crops.find((c) => c.crop.slug === cropSlug);
  const [applications, setApplications] = useState(selected?.step.applications ?? 2);
  const [adding, setAdding] = useState(false);

  const chooseCrop = (slug: string) => {
    setCropSlug(slug);
    const step = crops.find((c) => c.crop.slug === slug)?.step;
    setApplications(step?.applications ?? 2);
  };

  const acreage = Number(acres) > 0 ? Number(acres) : 0;
  const litres = litresForArea(acreage, applications);
  const plan = litres > 0 ? bestPackPlan(sortPacks(packs), litres) : null;
  const enoughStock = litres <= product.stock_quantity;

  const add = async () => {
    if (!plan) return;
    setAdding(true);
    await addPacksToCart(
      plan.lines.map((l) => ({ productId: product.id, variantId: l.pack.id, quantity: l.quantity }))
    );
    setAdding(false);
  };

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Calculator className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">How much do I need?</h2>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="calc-crop" className="text-xs text-muted-foreground">Crop</Label>
          <select
            id="calc-crop"
            className="w-full border border-border rounded-lg px-3 py-2 bg-card text-sm h-10"
            value={cropSlug}
            onChange={(e) => chooseCrop(e.target.value)}
          >
            {crops.map(({ crop }) => <option key={crop.slug} value={crop.slug}>{crop.name}</option>)}
            <option value="">Other crop</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="calc-acres" className="text-xs text-muted-foreground">Farm size (acres)</Label>
          <Input
            id="calc-acres" type="number" inputMode="decimal" min="0" step="0.5" placeholder="e.g. 5"
            value={acres} onChange={(e) => setAcres(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="calc-apps" className="text-xs text-muted-foreground">Applications per season</Label>
          <select
            id="calc-apps"
            className="w-full border border-border rounded-lg px-3 py-2 bg-card text-sm h-10"
            value={applications}
            onChange={(e) => setApplications(Number(e.target.value))}
          >
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {selected && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">When to apply on {selected.crop.name.toLowerCase()}:</span>{" "}
          {selected.step.timing}.{selected.step.note && ` ${selected.step.note}`}
        </p>
      )}

      {plan ? (
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-sm">
            You need <span className="font-semibold">{formatLitres(litres)}</span> for the season
            <span className="text-muted-foreground">
              {" "}({LITRES_PER_ACRE} L per acre × {acreage} acre{acreage === 1 ? "" : "s"} × {applications} application{applications === 1 ? "" : "s"})
            </span>
          </p>
          <ul className="text-sm space-y-1">
            {plan.lines.map((l) => (
              <li key={l.pack.id} className="flex justify-between">
                <span>{l.quantity} × {formatLitres(l.pack.size_liters)}</span>
                <span>{formatKes(l.pack.price * l.quantity)}</span>
              </li>
            ))}
            <li className="flex justify-between font-semibold border-t border-border pt-1">
              <span>Total ({formatLitres(plan.litres)})</span>
              <span className="text-primary">{formatKes(plan.price)}</span>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Mix each {LITRES_PER_ACRE} L with {WATER_LITRES_PER_ACRE} L of water: about{" "}
            {formatLitres(Math.ceil(acreage * WATER_LITRES_PER_ACRE))} of water per application for your farm.
          </p>
          {enoughStock ? (
            <Button className="w-full gap-2" onClick={add} disabled={adding}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              Add {formatLitres(plan.litres)} to cart
            </Button>
          ) : (
            <p className="text-sm text-destructive">
              We have {formatLitres(product.stock_quantity)} in stock right now. Contact us on WhatsApp and we'll arrange
              the full {formatLitres(litres)} for you.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Enter your farm size to see how much you need and the best-value packs.</p>
      )}
    </div>
  );
};

export default PackCalculator;
