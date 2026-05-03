"use client";

import { Search, Link2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";

interface TopNavProps {
  onImport: () => void;
}

export function TopNav({ onImport }: TopNavProps) {
  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder="Search company, founder, or launch URL…"
          className="pl-8 h-8 text-sm bg-background border-border focus-visible:ring-1 focus-visible:ring-primary"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={onImport}
        >
          <Link2 className="size-3.5" />
          Analyze Launch URLs
        </Button>

        <ThemeToggle />

        {/* Notifications */}
        <button className="relative size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <Bell className="size-4" />
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
        </button>

        {/* Avatar */}
        <div className="size-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-xs shrink-0 select-none">
          AS
        </div>
      </div>
    </header>
  );
}
