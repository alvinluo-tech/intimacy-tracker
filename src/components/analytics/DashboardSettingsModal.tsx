"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { DashboardWidgets } from "./useDashboardWidgets";

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
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] bg-[#141b26] text-white border border-white/[0.05] p-0 overflow-hidden shadow-2xl rounded-[24px] focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="px-6 pt-6 pb-4 relative">
            <Dialog.Title className="text-xl font-medium text-white">Customize Dashboard</Dialog.Title>
            <Dialog.Close className="absolute right-6 top-6 text-[#8b95a3] hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <div className="px-6 pb-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8b95a3] mb-4">
              WIDGETS
            </div>

            <div className="space-y-2">
              {widgetOptions.map((opt) => (
                <div
                  key={opt.id}
                  className="flex items-center justify-between p-4 rounded-[16px] bg-[#1a2333] border border-white/[0.02]"
                >
                  <div>
                    <div className="text-[15px] font-medium text-white">{opt.title}</div>
                    <div className="text-[13px] text-[#8b95a3] mt-0.5">{opt.subtitle}</div>
                  </div>
                  <Switch
                    checked={widgets[opt.id as keyof DashboardWidgets]}
                    onCheckedChange={(checked) =>
                      onUpdateWidgets({ [opt.id]: checked })
                    }
                    className="data-[state=checked]:bg-[#ff5577]"
                  />
                </div>
              ))}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
