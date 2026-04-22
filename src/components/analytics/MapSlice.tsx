import Link from "next/link";
import { MapPin } from "lucide-react";

export function MapSlice({ cityCount, footprintCount }: { cityCount: number; footprintCount: number }) {
  return (
    <Link href="/map" className="block w-full h-full">
      <div className="relative w-full h-full overflow-hidden rounded-[20px] border border-white/[0.02] transition-colors hover:border-white/[0.05] group">
        {/* Background dark map image */}
        <div
          className="absolute inset-0 w-full h-full opacity-40 group-hover:opacity-50 transition-opacity duration-500"
          style={{
            backgroundImage: "url('/map-slice-bg.png')", // Provide a fallback dark abstract map background or linear gradient
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        {/* Fallback gradient if image is not present */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1f2e] to-[var(--brand)]/20 mix-blend-overlay" />
        
        {/* Dark overlay to ensure text readability */}
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500" />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
          <div className="flex items-center gap-2 text-white/90 mb-2">
            <MapPin className="h-5 w-5 text-[var(--brand)] drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
            <span className="text-[13px] font-medium tracking-widest uppercase">
              地理切片
            </span>
          </div>
          
          <div className="privacy-blur-target flex items-baseline gap-3">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-white tracking-tight drop-shadow-md">
                {cityCount}
              </span>
              <span className="text-[14px] font-medium text-white/70">城市</span>
            </div>
            <span className="text-white/30 font-light text-xl">/</span>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-white tracking-tight drop-shadow-md">
                {footprintCount}
              </span>
              <span className="text-[14px] font-medium text-white/70">足迹</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}