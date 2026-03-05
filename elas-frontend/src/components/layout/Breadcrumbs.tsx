"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type BreadcrumbItem = { label: string; href?: string };

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm text-muted">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={14} className="opacity-50" />}
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-fg transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-fg font-medium" : undefined}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}