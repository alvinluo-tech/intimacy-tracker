"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";

export function MapSlice({ cityCount, footprintCount }: { cityCount: number; footprintCount: number }) {
  const router = useRouter();
  
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapStaticUrl = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/-73.985,40.748,10,0/400x300@2x?access_token=${mapboxToken}`;

  return (
    <button 
      onClick={() => router.push("/map")} 
      className="bg-[#0f172a] w-full h-full min-h-[224px] rounded-2xl border border-slate-800 overflow-hidden relative group cursor-pointer transition-all hover:border-[#f43f5e]/50"
    >
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:opacity-40 transition-opacity" 
        style={{ 
          backgroundImage: `url(${mapStaticUrl})`, 
          filter: "brightness(0.4) contrast(1.2)", 
        }} 
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent" />
      
      <div className="relative z-10 h-full flex flex-col items-center justify-center p-6"> 
        <div className="mb-3 flex items-center justify-center">
          <MapPin size={24} strokeWidth={1.5} color="#f43f5e" />
        </div>
        <p className="text-[28px] font-light text-slate-200 mb-1 privacy-blur-target">{cityCount}</p> 
        <p className="text-[11px] text-slate-400 uppercase tracking-wider">Cities</p> 
        <div className="mt-3 pt-3 border-t border-slate-700/50 w-[100px] flex flex-col items-center"> 
          <p className="text-[20px] font-light text-slate-300 privacy-blur-target">{footprintCount}</p> 
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Footprints</p> 
        </div>
        <div className="mt-4 text-[10px] text-slate-600 group-hover:text-[#f43f5e] transition-colors"> 
          View Map → 
        </div>
      </div>
    </button>
  );
}