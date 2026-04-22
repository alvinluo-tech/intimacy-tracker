import Link from "next/link";
import { MapPin } from "lucide-react";

export function MapSlice({ cityCount, footprintCount }: { cityCount: number; footprintCount: number }) {
  return (
    <Link href="/map" className="block w-full h-full">
      <div className="relative w-full h-full overflow-hidden rounded-[20px] border border-[var(--brand)]/20 transition-all hover:border-[var(--brand)]/50 group bg-[#0d111a] flex flex-col items-center justify-center py-8">
        {/* Background dark map image */}
        <div
          className="absolute inset-0 w-full h-full opacity-20 group-hover:opacity-30 transition-opacity duration-500"
          style={{
            backgroundImage: "url('/map-slice-bg.png')", // Provide a fallback dark abstract map background or linear gradient
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        {/* Fallback gradient if image is not present */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d111a]/50 to-[#0d111a] mix-blend-overlay" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full">
          <MapPin className="h-6 w-6 text-[var(--brand)] mb-4 stroke-[1.5]" />
          
          <div className="flex flex-col items-center privacy-blur-target">
            <span className="text-[40px] font-light text-white tracking-tight leading-none mb-2">
              {cityCount}
            </span>
            <span className="text-[11px] text-[#8a8f98] tracking-[0.1em] uppercase">
              Cities
            </span>
          </div>
          
          <div className="w-16 h-px bg-white/10 my-5" />
          
          <div className="flex flex-col items-center privacy-blur-target">
            <span className="text-[40px] font-light text-white tracking-tight leading-none mb-2">
              {footprintCount}
            </span>
            <span className="text-[11px] text-[#8a8f98] tracking-[0.1em] uppercase">
              Footprints
            </span>
          </div>
          
          <div className="mt-8 text-[13px] font-medium text-[var(--brand)] group-hover:text-[var(--brand-hover)] transition-colors flex items-center gap-1">
            View Map &rarr;
          </div>
        </div>
      </div>
    </Link>
  );
}