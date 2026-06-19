"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User } from "lucide-react";
import { Logo } from "./Logo";
import { NAV, isActive } from "@/lib/nav";
import { canAccess } from "@/lib/rbac";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/cn";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const items = NAV.filter((item) => !user || canAccess(user.role, item.href));

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-brand lg:flex">
      <div className="flex h-16 items-center border-b border-white/10 px-5">
        <Logo size={32} onDark showTagline={false} />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active = isActive(item.href, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon size={18} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <Link
          href="/profil"
          aria-current={isActive("/profil", pathname) ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors",
            isActive("/profil", pathname)
              ? "bg-white/15 text-white"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          )}
        >
          <User size={18} aria-hidden />
          Mon profil
        </Link>
      </div>
      <div className="border-t border-white/10 p-4 text-xs text-white/50">
        TREKKA · v0.1
        <br />
        Monitoring BTP — Cameroun
      </div>
    </aside>
  );
}
