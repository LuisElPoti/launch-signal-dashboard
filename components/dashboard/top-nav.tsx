"use client";

import { Bell, Check, EllipsisVertical, Link2, Search, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { NAV_ITEMS } from "@/components/dashboard/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface TopNavProps {
  onImport: () => void;
  activeSection: string;
  onNavigate: (id: string) => void;
}

export function TopNav({ onImport, activeSection, onNavigate }: TopNavProps) {
  return (
    <header className="min-h-14 border-b border-border bg-card flex items-center px-3 sm:px-4 gap-2 sm:gap-3 shrink-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="md:hidden size-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
            aria-label="Open navigation menu"
          >
            <EllipsisVertical className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="flex items-center gap-2">
            <span className="size-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
              <Zap className="size-3.5" />
            </span>
            Launch Signal
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <DropdownMenuItem
                key={item.id}
                className={cn("cursor-pointer", isActive && "bg-accent text-accent-foreground")}
                onClick={() => onNavigate(item.id)}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
                {isActive && <Check className="ml-auto size-3.5 text-primary" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="hidden min-[420px]:flex md:hidden items-center gap-2 min-w-0">
        <div className="size-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Zap className="size-3.5 text-primary-foreground" strokeWidth={2.5} />
        </div>
        <span className="text-sm font-semibold text-foreground truncate">Launch Signal</span>
      </div>

      <div className="relative hidden sm:block flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder="Search company, founder, or launch URL..."
          className="pl-8 h-8 text-sm bg-background border-border focus-visible:ring-1 focus-visible:ring-primary"
        />
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 px-2.5 sm:px-3"
          onClick={onImport}
        >
          <Link2 className="size-3.5" />
          <span className="hidden min-[380px]:inline">Analyze</span>
          <span className="hidden sm:inline"> Launch URLs</span>
        </Button>

        <ThemeToggle />

        <button className="hidden min-[420px]:flex relative size-8 rounded-lg items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <Bell className="size-4" />
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
        </button>

        <div className="hidden min-[420px]:flex size-8 rounded-full bg-primary/15 items-center justify-center text-primary font-semibold text-xs shrink-0 select-none">
          AS
        </div>
      </div>
    </header>
  );
}
