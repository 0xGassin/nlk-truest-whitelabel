"use client";

import { ListFilter } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createFilter, Filters, type Filter, type FilterFieldConfig } from "@/components/ui/filters";

const selectOperators = [
  { label: "is", value: "is" },
  { label: "is not", value: "is_not" },
];

const fields: FilterFieldConfig[] = [
  {
    key: "scanStatus",
    label: "Scan Status",
    operators: selectOperators,
    options: [
      { label: "Scanning", value: "scanning" },
      { label: "Never scanned", value: "never" },
      { label: "Scanned", value: "scanned" },
    ],
    type: "select",
  },
];

declare global {
  interface Window {
    __frames?: { t: number; wrapperWidth: number; wrapperHeight: number; chipWidth: number; chipHeight: number }[];
  }
}

export default function DevFilterTestPage() {
  const [filters, setFilters] = useState<Filter[]>(() => [createFilter("scanStatus", "is", ["never"])]);

  return (
    <main className="flex min-h-screen flex-col items-start gap-4 p-8">
      <div id="row" className="flex items-center gap-3">
        <Filters
          fields={fields}
          filters={filters}
          onChange={setFilters}
          trigger={
            <Button className="h-9 gap-1.5" variant="outline">
              <ListFilter className="size-4" />
              Add Filter
            </Button>
          }
        />
      </div>
      <div id="measure" className="sr-only">
        test
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.__frames = [];
            const rec = () => {
              const w = document.querySelector('[class*="rounded-md"][class*="overflow-hidden"][class*="h-9"]');
              const p = w?.parentElement;
              if (w && p) {
                const wr = p.getBoundingClientRect();
                const cr = w.getBoundingClientRect();
                window.__frames.push({ t: performance.now(), wrapperWidth: wr.width, wrapperHeight: wr.height, chipWidth: cr.width, chipHeight: cr.height });
              }
              requestAnimationFrame(rec);
            };
            requestAnimationFrame(rec);
          `,
        }}
      />
    </main>
  );
}
