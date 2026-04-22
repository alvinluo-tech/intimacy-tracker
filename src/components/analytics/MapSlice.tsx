import Link from "next/link";
import React from "react";

const CustomMapPin = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 21s-6-5.5-6-10a6 6 0 1 1 12 0c0 4.5-6 10-6 10z" />
    <circle cx="12" cy="11" r="2.5" />
  </svg>
);

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
          <CustomMapPin className="h-7 w-7 text-[#FF4D73] mb-5" />
          
          <div className="flex flex-col items-center privacy-blur-target gap-1.5">
            <span className="text-[44px] font-normal text-[#f8fafc] tracking-tight leading-none">
              {cityCount}
            </span>
            <span className="text-[12px] text-[#94a3b8] tracking-[0.1em] uppercase">
              Cities
            </span>
          </div>
          
          <div className="w-[80px] h-px bg-[#334155] my-6" />
          
          <div className="flex flex-col items-center privacy-blur-target gap-1.5">
            <span className="text-[44px] font-normal text-[#f8fafc] tracking-tight leading-none">
              {footprintCount}
            </span>
            <span className="text-[12px] text-[#94a3b8] tracking-[0.1em] uppercase">
              Footprints
            </span>
          </div>
          
          <div className="mt-6 text-[13px] font-normal text-[#FF4D73]/90 group-hover:text-[#FF4D73] transition-colors flex items-center gap-1">
            View Map &rarr;
          </div>
        </div>
      </div>
    </Link>
  );
}