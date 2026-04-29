"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { LayoutGrid, Map, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { DashboardWidgets } from "./useDashboardWidgets";
import { cn } from "@/lib/utils/cn";

interface DashboardSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgets: DashboardWidgets;
  onUpdateWidgets: (widgets: Partial<DashboardWidgets>) => void;
}

export function DashboardSettingsModal({
  open,
  onOpenChange,
  widgets,
  onUpdateWidgets,
}: DashboardSettingsModalProps) {
  const t = useTranslations("analytics");

  const widgetOptions = [
    { id: "quickStats", title: t("quickStats"), subtitle: t("quickStatsSubtitle") },
    { id: "activity30Days", title: t("thirtyDayActivity"), subtitle: t("thirtyDayActivitySubtitle") },
    { id: "yearOverview", title: t("yearOverview"), subtitle: t("yearOverviewSubtitle") },
    { id: "weekdayPattern", title: t("weekdayPattern"), subtitle: t("weekdayPatternSubtitle") },
    { id: "mapSlice", title: t("mapSlice"), subtitle: t("mapSliceSubtitle") },
    { id: "timeOfDay", title: t("timeOfDay"), subtitle: t("timeOfDaySubtitle") },
    { id: "durationDistribution", title: t("durationDistribution"), subtitle: t("durationDistributionSubtitle") },
    { id: "topTags", title: t("topTags"), subtitle: t("topTagsSubtitle") },
  ] as const;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[calc(100vw-24px)] max-w-xl translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-[28px] border border-border bg-surface text-content shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="border-b border-border/50 bg-gradient-to-br from-primary/5 to-transparent px-6 pb-5 pt-6">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-muted/10">
              <LayoutGrid className="h-5 w-5 text-primary" />
            </div>
            <Dialog.Title className="text-xl font-semibold tracking-[-0.02em] text-content text-white">
              {t("customizeDashboard")}
            </Dialog.Title>
            <p className="mt-2 text-sm text-muted">
              {t("toggleWidgetsDescription")}
            </p>
            <Dialog.Close className="absolute right-6 top-6 rounded-full p-2 text-muted transition-colors hover:bg-muted/10 hover:text-content">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">
              {t("widgets")}
            </div>
            <div className="space-y-3">
              {widgetOptions.map((opt) => (
                <div
                  key={opt.id}
                  className="flex items-center justify-between rounded-[20px] border border-border bg-muted/5 px-4 py-4"
                >
                  <div>
                    <div className="text-[15px] font-medium text-content">{opt.title}</div>
                    <div className="mt-0.5 text-[13px] text-muted">{opt.subtitle}</div>
                  </div>
                  <Switch
                    checked={widgets[opt.id as keyof DashboardWidgets]}
                    onCheckedChange={(checked) =>
                      onUpdateWidgets({ [opt.id]: checked })
                    }
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              ))}
            </div>

            <div className="mb-4 mt-8 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">
              {t("mapSlice")}
            </div>
            <div className="rounded-[24px] border border-border bg-muted/5 p-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-muted/10">
                  <Map className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="text-[15px] font-medium text-content">{t("visibleMetrics")}</div>
                  <div className="text-[13px] text-muted">
                    {t("visibleMetricsDescription")}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div
                  className={cn(
                    "flex items-center justify-between rounded-[18px] border border-border bg-surface/50 px-4 py-3",
                    !widgets.mapSlice && "opacity-50"
                  )}
                >
                  <div>
                    <div className="text-[14px] font-medium text-white">{t("cities")}</div>
                    <div className="text-[12px] text-muted">{t("citiesDescription")}</div>
                  </div>
                  <Switch
                    checked={widgets.mapCities}
                    disabled={!widgets.mapSlice}
                    onCheckedChange={(checked) => onUpdateWidgets({ mapCities: checked })}
                    className="data-[state=checked]:bg-[#8b5cf6]"
                  />
                </div>

                <div
                  className={cn(
                    "flex items-center justify-between rounded-[18px] border border-white/6 bg-surface/40 px-4 py-3",
                    !widgets.mapSlice && "opacity-50"
                  )}
                >
                  <div>
                    <div className="text-[14px] font-medium text-white">{t("footprints")}</div>
                    <div className="text-[12px] text-muted">{t("footprintsDescription")}</div>
                  </div>
                  <Switch
                    checked={widgets.mapFootprints}
                    disabled={!widgets.mapSlice}
                    onCheckedChange={(checked) => onUpdateWidgets({ mapFootprints: checked })}
                    className="data-[state=checked]:bg-[#f43f5e]"
                  />
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
