"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type TableProps = React.TableHTMLAttributes<HTMLTableElement>;
type SectionProps = React.HTMLAttributes<
  HTMLTableSectionElement | HTMLTableRowElement | HTMLTableCellElement
>;
type TCellProps = React.TdHTMLAttributes<HTMLTableCellElement>;
type THeadCellProps = React.ThHTMLAttributes<HTMLTableCellElement>;

const tableWrapClass =
  "w-full overflow-x-auto rounded-elas-lg ring-1 ring-[color:var(--border)]/25 bg-surface shadow-soft";

const cellBaseClass =
  "px-4 py-3 text-sm align-middle border-b border-[color:var(--border)] last:border-b-0";

export default function Table({ className, children, ...props }: TableProps) {
  return (
    <div className={tableWrapClass}>
      <table className={cn("w-full border-collapse text-left", className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function THead({ className, children, ...props }: SectionProps) {
  return (
    <thead
      className={cn(
        "bg-surface-subtle/70 text-xs uppercase tracking-[0.12em] text-muted",
        className
      )}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TBody({ className, children, ...props }: SectionProps) {
  return (
    <tbody className={cn("text-[color:var(--text)]", className)} {...props}>
      {children}
    </tbody>
  );
}

export function TRow({ className, children, ...props }: SectionProps) {
  return (
    <tr
      className={cn(
        "transition-colors hover:bg-surface-subtle/55",
        "[&:last-child_td]:border-b-0 [&:last-child_th]:border-b-0",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TH({ className, children, ...props }: THeadCellProps) {
  return (
    <th
      className={cn(
        cellBaseClass,
        "font-semibold text-muted first:pl-5 last:pr-5",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TCell({ className, children, ...props }: TCellProps) {
  return (
    <td
      className={cn(
        cellBaseClass,
        "text-[color:var(--text)] first:pl-5 last:pr-5",
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
}

export function TMuted({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("text-sm text-muted", className)} {...props}>
      {children}
    </span>
  );
}