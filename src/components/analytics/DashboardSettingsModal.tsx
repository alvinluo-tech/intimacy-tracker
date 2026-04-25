"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { LayoutGrid, Map, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { DashboardWidgets } from "./useDashboardWidgets";
import { cn } from "@/lib/utils/cn";

interface DashboardSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgets: DashboardWidgets;
  onUpdateWidgets: (widgets: Partial<DashboardWidgets>) => void;
}

const widgetOptions = [
  { id: "quickStats", title: "Quick Stats", subtitle: "Week/Duration/Rating/Last" },
  { id: "activity30Days", title: "30-Day Activity", subtitle: "Frequency curve chart" },
  { id: "yearOverview", title: "Year Overview", subtitle: "GitHub-style heatmap" },
  { id: "weekdayPattern", title: "Weekday Pattern", subtitle: "Weekly distribution" },
  { id: "mapSlice", title: "Map Slice", subtitle: "Geographic diversity" },
  { id: "timeOfDay", title: "Time of Day", subtitle: "Morning/Afternoon/Evening/Night" },
  { id: "durationDistribution", title: "Duration Distribution", subtitle: "Time range buckets" },
  { id: "topTags", title: "Top Tags", subtitle: "Most used tags" },
] as const;

export function DashboardSettingsModal({
  open,
  onOpenChange,
  widgets,
  onUpdateWidgets,
}: DashboardSettingsModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[calc(100vw-24px)] max-w-xl translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-[28px] border border-white/10 bg-[#0f172a] text-white shadow-[0_30px_80px_rgba(2,6,23,0.75)] focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="border-b border-white/6 bg-[linear-gradient(135deg,rgba(139,92,246,0.12),rgba(15,23,42,0))] px-6 pb-5 pt-6">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <LayoutGrid className="h-5 w-5 text-[#f43f5e]" />
            </div>
            <Dialog.Title className="text-xl font-semibold tracking-[-0.02em] text-white">
              Customize Dashboard
            </Dialog.Title>
            <p className="mt-2 text-sm text-slate-400">
              Toggle each widget and fine-tune what appears inside your map slice.
            </p>
            <Dialog.Close className="absolute right-6 top-6 rounded-full p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Widgets
            </div>
            <div className="space-y-3">
              {widgetOptions.map((opt) => (
                <div
                  key={opt.id}
                  className="flex items-center justify-between rounded-[20px] border border-white/6 bg-white/[0.03] px-4 py-4"
                >
                  <div>
                    <div className="text-[15px] font-medium text-white">{opt.title}</div>
                    <div className="mt-0.5 text-[13px] text-slate-400">{opt.subtitle}</div>
                  </div>
                  <Switch
                    checked={widgets[opt.id as keyof DashboardWidgets]}
                    onCheckedChange={(checked) =>
                      onUpdateWidgets({ [opt.id]: checked })
                    }
                    className="data-[state=checked]:bg-[#f43f5e]"
                  />
                </div>
              ))}
            </div>

            <div className="mb-4 mt-8 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Map Slice
            </div>
            <div className="rounded-[24px] border border-white/6 bg-white/[0.03] p-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/5">
                  <Map className="h-4 w-4 text-[#8b5cf6]" />
                </div>
                <div>
                  <div className="text-[15px] font-medium text-white">Visible metrics</div>
                  <div className="text-[13px] text-slate-400">
                    Show or hide counters inside the interactive map card.
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div
                  className={cn(
                    "flex items-center justify-between rounded-[18px] border border-white/6 bg-slate-950/40 px-4 py-3",
                    !widgets.mapSlice && "opacity-50"
                  )}
                >
                  <div>
                    <div className="text-[14px] font-medium text-white">Cities</div>
                    <div className="text-[12px] text-slate-400">Unique cities visited</div>
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
                    "flex items-center justify-between rounded-[18px] border border-white/6 bg-slate-950/40 px-4 py-3",
                    !widgets.mapSlice && "opacity-50"
                  )}
                >
                  <div>
                    <div className="text-[14px] font-medium text-white">Footprints</div>
                    <div className="text-[12px] text-slate-400">Distinct places or coordinates</div>
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
