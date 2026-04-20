"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { exportCsvAction } from "@/features/export/actions";
import { Button } from "@/components/ui/button";

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ExportButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="primary"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const res = await exportCsvAction();
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          downloadCsv(res.filename, res.csv);
          toast.success(`导出成功，共 ${res.rows} 条记录`);
        });
      }}
    >
      {pending ? "导出中..." : "导出 CSV"}
    </Button>
  );
}
