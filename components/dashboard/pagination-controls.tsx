"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({
  page,
  pageSize,
  totalItems,
  onPageChange,
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-center justify-between gap-3 border-t border-border px-3 sm:px-5 py-3">
      <p className="text-xs text-muted-foreground">
        Showing {start}-{end} of {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <button
          className={cn(
            "size-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground transition-colors",
            page > 1 ? "hover:text-foreground hover:bg-muted/60" : "opacity-40 cursor-not-allowed"
          )}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-3.5" />
        </button>
        <span className="text-xs font-mono text-muted-foreground">
          {page}/{totalPages}
        </span>
        <button
          className={cn(
            "size-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground transition-colors",
            page < totalPages ? "hover:text-foreground hover:bg-muted/60" : "opacity-40 cursor-not-allowed"
          )}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
