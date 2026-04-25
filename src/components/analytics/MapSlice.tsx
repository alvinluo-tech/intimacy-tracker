"use client";

import React from "react";
import { MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";

export function MapSlice({ cityCount = 0, footprintCount = 0 }: { cityCount?: number; footprintCount?: number }) {
  return (
    <Link
      href="/map"
      className="group relative block h-full w-full overflow-hidden rounded-[20px] bg-slate-900 border border-slate-800 shadow-sm shadow-black/20"
    >
      <div
        className="absolute inset-0 opacity-40 transition-transform duration-700 group-hover:scale-105 filter brightness-50"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent" />
      
      {/* Decorative lines/labels for the map feel */}
      <div className="absolute top-4 left-4 text-[10px] text-slate-500 font-mono opacity-50">Union City</div>
      <div className="absolute top-8 right-12 text-[10px] text-slate-500 font-mono opacity-30">UPPER EAST SIDE</div>
      <div className="absolute top-1/2 left-8 text-[12px] text-slate-500 font-mono opacity-40">MANHATTAN</div>
      <div className="absolute bottom-8 right-8 text-[10px] text-slate-500 font-mono opacity-30">LGA</div>

      <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center relative z-10">
        <MapPin className="h-6 w-6 text-rose-500 mb-2 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
        <div className="space-y-3">
          <div>
            <p className="text-[32px] font-medium text-slate-100 leading-none privacy-blur-target">{cityCount}</p>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mt-1">Cities</p>
          </div>
          <div className="w-8 h-[1px] bg-slate-700 mx-auto" />
          <div>
            <p className="text-[24px] font-medium text-slate-200 leading-none privacy-blur-target">{footprintCount}</p>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mt-1">Footprints</p>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-4 right-4 flex items-center text-[12px] font-medium text-slate-400 opacity-80 group-hover:opacity-100 group-hover:text-slate-200 transition-all z-10">
        View Map <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}