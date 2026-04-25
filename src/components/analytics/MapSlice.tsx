"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";

export function MapSlice({ cityCount, footprintCount }: { cityCount: number; footprintCount: number }) {
  const router = useRouter();
  
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapStaticUrl = mapboxToken ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/-73.985,40.748,10,0/400x300@2x?access_token=${mapboxToken}` : "";

  return (
    <button 
      onClick={() => router.push("/map")} 
      className="bg-[#0f172a] w-full h-full min-h-[224px] rounded-[20px] border border-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden relative group cursor-pointer transition-all hover:border-[#f43f5e]/50"
    >
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:opacity-40 transition-opacity" 
        style={{ 
          backgroundImage: mapStaticUrl ? `url(${mapStaticUrl})` : "none", 
          filter: "brightness(0.4) contrast(1.2)", 
        }} 
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/50 to-transparent" />
      
      <div className="relative z-10 h-full flex flex-col items-center justify-center p-6"> 
        <div className="mb-3 flex items-center justify-center">
          <MapPin size={28} strokeWidth={1.5} className="text-[#f43f5e]" />
        </div>
        <p className="text-[36px] font-light text-white mb-1 privacy-blur-target leading-none">{cityCount}</p> 
        <p className="text-[12px] font-medium text-[#8b95a3] uppercase tracking-[0.15em]">Cities</p> 
        
        <div className="my-4 border-t border-white/[0.08] w-[120px]"></div>
        
        <div className="flex flex-col items-center"> 
          <p className="text-[28px] font-light text-[#d0d6e0] mb-1 privacy-blur-target leading-none">{footprintCount}</p> 
          <p className="text-[11px] font-medium text-[#8b95a3] uppercase tracking-[0.15em]">Footprints</p> 
        </div>
        
        <div className="mt-5 text-[12px] text-[#62666d] group-hover:text-[#f43f5e] transition-colors"> 
          View Map &rarr; 
        </div>
      </div>
    </button>
  );
}