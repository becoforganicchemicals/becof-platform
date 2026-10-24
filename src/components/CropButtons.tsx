import { Link } from "react-router-dom";
import { ArrowRight, Bean, LeafyGreen, Sprout, Wheat, type LucideIcon } from "lucide-react";
import { CROP_PROGRAMMES } from "@/lib/cropProgrammes";
import { cn } from "@/lib/utils";

// lucide has no maize or potato icon: wheat stands in for the cereal, and a
// sprout for the tuber crop.
const CROP_ICONS: Record<string, LucideIcon> = {
  maize: Wheat,
  beans: Bean,
  potatoes: Sprout,
  vegetables: LeafyGreen,
};

// "Shop by crop" buttons, linking to each crop guide. Used on the products
// page, the homepage, the FAQ and article sidebars so they look the same
// everywhere. `stacked` puts them in one column, for narrow sidebars.
const CropButtons = ({
  className, title = "Shop by crop", stacked = false,
}: { className?: string; title?: string | null; stacked?: boolean }) => (
  <nav aria-label="Shop by crop" className={className}>
    {title && <p className="text-sm font-semibold mb-3">{title}</p>}
    <div className={stacked ? "grid gap-3" : "grid grid-cols-2 md:grid-cols-4 gap-3"}>
      {CROP_PROGRAMMES.map((crop) => {
        const Icon = CROP_ICONS[crop.slug] ?? Sprout;
        return (
          <Link
            key={crop.slug}
            to={`/crops/${crop.slug}`}
            className={cn(
              "group flex items-center gap-2.5 sm:gap-3 min-h-[3.25rem] min-w-0 rounded-xl border-2 border-primary/20 bg-card px-3 sm:px-4 py-3",
              "text-[15px] sm:text-base font-semibold text-foreground shadow-sm transition-all",
              "hover:border-primary hover:bg-primary/5 hover:shadow-md active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            )}
          >
            <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
            </span>
            <span className="flex-1 min-w-0">{crop.name}</span>
            {/* Two buttons per row on phones leaves no room for the arrow */}
            <ArrowRight
              className={cn(
                stacked ? "block" : "hidden sm:block",
                "h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5",
              )}
            />
          </Link>
        );
      })}
    </div>
  </nav>
);

export default CropButtons;
