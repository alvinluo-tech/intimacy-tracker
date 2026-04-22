import Link from "next/link";
import React from "react";

export function MapSlice({ cityCount, footprintCount }: { cityCount: number; footprintCount: number }) {
  return (
    <Link href="/map" className="block w-full h-full">
      <div className="relative w-full h-full overflow-hidden rounded-[20px] border border-[#FF4D73]/20 transition-all hover:border-[#FF4D73]/50 group bg-[#0A0F16] flex flex-col items-center justify-center py-10">
        {/* Background dark map image */}
        <div
          className="absolute inset-0 w-full h-full opacity-30 group-hover:opacity-40 transition-opacity duration-500"
          style={{
            backgroundImage: "url('/map-slice-bg.png')", // Provide a fallback dark abstract map background or linear gradient
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        {/* Fallback gradient if image is not present */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0A0F16]/90 mix-blend-overlay" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full">
          <div className="flex flex-col items-center privacy-blur-target gap-2">
            <span className="text-[48px] font-normal text-[#f8fafc] tracking-tight leading-none">
              {cityCount}
            </span>
            <span className="text-[12px] text-[#94a3b8] tracking-[0.1em] uppercase">
              Cities
            </span>
          </div>
          
          <div className="w-[100px] h-[1px] bg-[#334155] my-8" />
          
          <div className="flex flex-col items-center privacy-blur-target gap-2">
            <span className="text-[48px] font-normal text-[#f8fafc] tracking-tight leading-none">
              {footprintCount}
            </span>
            <span className="text-[12px] text-[#94a3b8] tracking-[0.1em] uppercase">
              Footprints
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}