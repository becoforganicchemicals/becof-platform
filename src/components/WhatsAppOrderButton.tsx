import { FaWhatsapp } from "react-icons/fa";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

const WhatsAppOrderButton = ({
  message, label = "Order via WhatsApp", className,
}: { message: string; label?: string; className?: string }) => (
  <a
    href={buildWhatsAppLink(message)}
    target="_blank"
    rel="noopener noreferrer"
    className={cn(
      "w-full inline-flex items-center justify-center gap-2 h-11 rounded-md border border-[#25D366]/40 bg-[#25D366]/10 text-[#128C7E] font-medium text-sm hover:bg-[#25D366]/15 transition-colors",
      className
    )}
  >
    <FaWhatsapp className="h-4 w-4" /> {label}
  </a>
);

export default WhatsAppOrderButton;
