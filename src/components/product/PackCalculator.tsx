import { useState } from "react";
import { Calculator, Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/contexts/CartContext";
import { formatKes } from "@/lib/delivery";
import { amountForArea, bestPackPlan, formatAmount, formatSize, sortPacks, unitOf, type PackSize } from "@/lib/packs";
import { PRODUCT_USAGE, programmesForProduct } from "@/lib/cropProgrammes";

interface Props {
  product: { id: string; slug: string; name: string; stock_quantity: number; unit?: string | null };
  packs: PackSize[];
}

// "How much do I need?" for one product: farm size × the product's rate for the
// chosen crop × applications → amount → the cheapest packs, in one click.
const PackCalculator = ({ product, packs }: Props) => {
  const { addPacksToCart } = useCart();
  const unit = unitOf(product.unit);
  const crops = programmesForProduct(product.slug);
  const usage = PRODUCT_USAGE[product.slug];
  const [cropSlug, setCropSlug] = useState(crops[0]?.crop.slug ?? "");
  const [acres, setAcres] = useState("");
  const selected = crops.find((c) => c.crop.slug === cropSlug);
  const [applications, setApplications] = useState(selected?.step.applications ?? usage?.applications ?? 1);
  const [adding, setAdding] = useState(false);

  const rate = selected?.step.ratePerAcre ?? usage?.ratePerAcre;
  if (!rate) return null;
  const rateText = selected?.step.rateText ?? usage?.rateText;

  const chooseCrop = (slug: string) => {
    setCropSlug(slug);
    const step = crops.find((c) => c.crop.slug === slug)?.step;
    setApplications(step?.applications ?? usage?.applications ?? 1);
  };

  const acreage = Number(acres) > 0 ? Number(acres) : 0;
  const needed = amountForArea(acreage, rate, applications);
  const plan = needed > 0 ? bestPackPlan(sortPacks(packs), needed) : null;
  const enoughStock = (plan?.amount ?? 0) <= product.stock_quantity;

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
            {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Rate:</span> {rateText}.{" "}
        <span className="font-medium text-foreground">When:</span>{" "}
        {selected ? `${selected.step.timing}.` : usage?.how}
        {selected?.step.note && ` ${selected.step.note}`}
      </p>

      {plan ? (
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-sm">
            You need <span className="font-semibold">{formatAmount(needed, unit)}</span> for the season
            <span className="text-muted-foreground">
              {" "}({acreage} acre{acreage === 1 ? "" : "s"} × {applications} application{applications === 1 ? "" : "s"})
            </span>
          </p>
          <ul className="text-sm space-y-1">
            {plan.lines.map((l) => (
              <li key={l.pack.id} className="flex justify-between">
                <span>{l.quantity} × {formatSize(l.pack.size_liters, unit)}</span>
                <span>{formatKes(l.pack.price * l.quantity)}</span>
              </li>
            ))}
            <li className="flex justify-between font-semibold border-t border-border pt-1">
              <span>Total ({formatAmount(plan.amount, unit)})</span>
              <span className="text-primary">{formatKes(plan.price)}</span>
            </li>
          </ul>
          {enoughStock ? (
            <Button className="w-full gap-2" onClick={add} disabled={adding}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              Add {formatAmount(plan.amount, unit)} to cart
            </Button>
          ) : (
            <p className="text-sm text-destructive">
              We don't have enough in stock for this amount right now. Contact us on WhatsApp and we'll arrange it.
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
