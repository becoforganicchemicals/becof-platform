import { useState } from "react";
import { Link } from "react-router-dom";
import { Calculator, Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/contexts/CartContext";
import { formatKes } from "@/lib/delivery";
import { bestPackPlan, formatLitres, litresForArea, sortPacks, type PackSize } from "@/lib/packs";
import type { CropProgramme } from "@/lib/cropProgrammes";

export interface ProgrammeProduct {
  id: string;
  slug: string;
  name: string;
  stock_quantity: number;
  product_variants?: PackSize[];
}

interface Props {
  programme: CropProgramme;
  products: ProgrammeProduct[];
}

// A whole season's programme for one crop: farm size → litres of each
// product → best-value packs, all added to the cart in one click.
const ProgrammeCalculator = ({ programme, products }: Props) => {
  const { addPacksToCart } = useCart();
  const [acres, setAcres] = useState("");
  const [applications, setApplications] = useState<Record<string, number>>(
    () => Object.fromEntries(programme.steps.map((s) => [s.productSlug, s.applications]))
  );
  const [adding, setAdding] = useState(false);

  const acreage = Number(acres) > 0 ? Number(acres) : 0;
  const rows = programme.steps
    .map((step) => {
      const product = products.find((p) => p.slug === step.productSlug);
      if (!product) return null;
      const apps = applications[step.productSlug] ?? step.applications;
      const litres = litresForArea(acreage, apps);
      const plan = litres > 0 ? bestPackPlan(sortPacks(product.product_variants), litres) : null;
      return { step, product, apps, litres, plan, enoughStock: litres <= product.stock_quantity };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const included = rows.filter((r) => r.plan && r.apps > 0);
  const total = included.reduce((sum, r) => sum + r.plan!.price, 0);
  const allInStock = included.every((r) => r.enoughStock);

  const add = async () => {
    setAdding(true);
    await addPacksToCart(
      included.flatMap((r) => r.plan!.lines.map((l) => ({ productId: r.product.id, variantId: l.pack.id, quantity: l.quantity })))
    );
    setAdding(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Calculator className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Plan your {programme.name.toLowerCase()} season</h2>
      </div>

      <div className="max-w-xs space-y-1.5">
        <Label htmlFor="programme-acres" className="text-sm">Farm size (acres)</Label>
        <Input
          id="programme-acres" type="number" inputMode="decimal" min="0" step="0.5" placeholder="e.g. 5"
          value={acres} onChange={(e) => setAcres(e.target.value)}
        />
      </div>

      <div className="divide-y divide-border border-y border-border">
        {rows.map((r) => (
          <div key={r.step.productSlug} className="py-3 grid sm:grid-cols-[1fr_auto_auto] gap-x-6 gap-y-2 items-center">
            <div>
              <Link to={`/products/${r.product.slug}`} className="font-medium hover:text-primary">{r.product.name}</Link>
              <p className="text-xs text-muted-foreground">{r.step.purpose}</p>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Applications
              <select
                className="border border-border rounded-md px-2 py-1 bg-card text-sm text-foreground"
                value={r.apps}
                onChange={(e) => setApplications((a) => ({ ...a, [r.step.productSlug]: Number(e.target.value) }))}
              >
                {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n === 0 ? "Skip" : n}</option>)}
              </select>
            </label>
            <div className="text-sm sm:text-right min-w-[11rem]">
              {r.plan ? (
                <>
                  <p className="font-medium">
                    {formatLitres(r.litres)} → {r.plan.lines.map((l) => `${l.quantity} × ${formatLitres(l.pack.size_liters)}`).join(" + ")}
                  </p>
                  <p className={r.enoughStock ? "text-muted-foreground" : "text-destructive"}>
                    {r.enoughStock ? formatKes(r.plan.price) : `Only ${formatLitres(r.product.stock_quantity)} in stock`}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">{r.apps === 0 ? "Skipped" : "—"}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {included.length > 0 ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-lg">
            Season total for {acreage} acre{acreage === 1 ? "" : "s"}: <span className="font-bold text-primary">{formatKes(total)}</span>
          </p>
          {allInStock ? (
            <Button size="lg" className="gap-2" onClick={add} disabled={adding}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              Add programme to cart
            </Button>
          ) : (
            <p className="text-sm text-destructive max-w-sm">
              Some products don't have enough stock for this farm size. Contact us on WhatsApp and we'll arrange the full amount.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Enter your farm size to see how much of each product you need for the season, and the cost.</p>
      )}
    </div>
  );
};

export default ProgrammeCalculator;
