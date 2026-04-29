"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DashboardWidgets } from "./useDashboardWidgets";

export function MapSlice({ 
  cityCount, 
  footprintCount, 
  totalCount,
  countryCount,
  widgets 
}: { 
  cityCount: number; 
  footprintCount: number; 
  totalCount: number;
  countryCount: number;
  widgets: DashboardWidgets;
}) {
  const router = useRouter();
  const t = useTranslations("analytics");
  
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapStaticUrl = mapboxToken ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/-73.985,40.748,10,0/400x300@2x?access_token=${mapboxToken}` : "";

  const visibleMetrics = [
    widgets.mapCountry ? { label: t("country"), value: countryCount, size: 36 } : null,
    widgets.mapCities ? { label: t("cities"), value: cityCount, size: 36 } : null,
    widgets.mapFootprints ? { label: t("footprints"), value: footprintCount, size: 28 } : null,
    widgets.mapCount ? { label: t("totalCount"), value: totalCount, size: 28 } : null,
  ].filter((m): m is { label: string; value: number; size: number } => m !== null);

  return (
    <button 
      onClick={() => router.push("/map")} 
      className="bg-surface w-full h-full min-h-[224px] rounded-[20px] border border-border/50 shadow-sm overflow-hidden relative group cursor-pointer transition-all hover:border-primary/50"
    >
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:opacity-40 transition-opacity" 
        style={{ 
          backgroundImage: mapStaticUrl ? `url(${mapStaticUrl})` : "none", 
          filter: "brightness(0.6) contrast(1.2)", 
        }} 
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
      
      <div className="relative z-10 h-full flex flex-col items-center justify-center p-6"> 
        <div className="mb-3 flex items-center justify-center">
          <MapPin size={28} strokeWidth={1.5} className="text-primary" />
        </div>
        
        {visibleMetrics.length > 0 && visibleMetrics.map((metric, index) => (
          <React.Fragment key={metric.label}>
            <div className="flex flex-col items-center">
              <p 
                className={`font-light text-content mb-1 privacy-blur-target leading-none ${index === 0 ? 'text-[36px]' : 'text-[28px] text-content/80'}`}
              >
                {metric.value}
              </p>
              <p className="text-[11px] font-medium text-muted uppercase tracking-[0.15em]">
                {metric.label}
              </p>
            </div>
            {index < visibleMetrics.length - 1 && <div className="my-3 border-t border-border w-[120px]"></div>}
          </React.Fragment>
        ))}
        
        {visibleMetrics.length === 0 && (
          <p className="text-[13px] text-muted">{t("noMetricsSelected")}</p>
        )}
        
        <div className="mt-5 text-[12px] text-muted group-hover:text-primary transition-colors">
          {t("viewMap")}
        </div>
      </div>
    </button>
  );
}