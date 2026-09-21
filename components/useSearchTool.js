"use client";
import { useEffect } from "react";
import { flushSync } from "react-dom";
import { z } from "zod";
import {
  searchSchema,
  normalizeFilters,
  serializeFilters,
  rangeError,
} from "@/lib/search";
export function useSearchTool(apply) {
  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: "filter_properties",
            title: "Filter marketplace properties",
            description:
              "Apply sale or rental filters to published homes. Updates the visible search; does not send inquiries.",
            inputSchema: z.toJSONSchema(searchSchema),
            annotations: { readOnlyHint: false, untrustedContentHint: true },
            execute: async (input) => {
              const filters = normalizeFilters({ ...input, page: 1 });
              if (rangeError(filters)) throw new Error(rangeError(filters));
              const response = await fetch(
                "/api/properties?" + serializeFilters(filters),
              );
              const data = await response.json();
              if (!response.ok) throw new Error(data.error);
              flushSync(() => apply(filters, data));
              return {
                count: data.count,
                properties: data.properties.map((p) => ({
                  id: p.id,
                  title: p.title,
                  price: p.price,
                  currency: p.currency,
                })),
              };
            },
          },
          { signal: controller.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => controller.abort();
  }, [apply]);
}
