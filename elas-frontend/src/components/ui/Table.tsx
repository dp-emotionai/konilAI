"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type TableProps    = React.TableHTMLAttributes<HTMLTableElement>;
type SectionProps  = React.HTMLAttributes<HTMLTableSectionElement | HTMLTableRowElement | HTMLTableCellElement>;
type TCellProps    = React.TdHTMLAttributes<HTMLTableCellElement>;
type THeadCellProps = React.ThHTMLAttributes<HTMLTableCellElement>;

export default function Table({ className, children, ...props }: TableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-elas-lg border border-border bg-surface shadow-soft">
      <table
        className={cn("w-full border-collapse text-left", className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function THead({ className, children, ...props }: SectionProps) {
  return (
    <thead
      className={cn(
        "bg-surface-subtle border-b border-border",
        "text-xs uppercase tracking-wider text-muted font-medium",
        className
      )}
      {...(props as React.HTMLAttributes<HTMLTableSectionElement>)}
    >
      {children}
    </thead>
  );
}

export function TBody({ className, children, ...props }: SectionProps) {
  return (
    <tbody
      className={cn("text-fg divide-y divide-border", className)}
      {...(props as React.HTMLAttributes<HTMLTableSectionElement>)}
    >
      {children}
    </tbody>
  );
}

export function TRow({ className, children, ...props }: SectionProps) {
  return (
    <tr
      className={cn(
        "transition-colors hover:bg-surface-subtle/60",
        "[&:last-child_td]:border-b-0 [&:last-child_th]:border-b-0",
        className
      )}
      {...(props as React.HTMLAttributes<HTMLTableRowElement>)}
    >
      {children}
    </tr>
  );
}

export function TH({ className, children, ...props }: THeadCellProps) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-sm align-middle",
        "font-semibold text-muted",
        "first:pl-5 last:pr-5",
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
        "px-4 py-3 text-sm align-middle text-fg",
        "first:pl-5 last:pr-5",
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
    <span className={cn("text-sm text-muted-2", className)} {...props}>
      {children}
    </span>
  );
}

/** Строка-заглушка когда нет данных */
export function TEmpty({
  colSpan,
  message = "Нет данных",
}: {
  colSpan: number;
  message?: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-10 text-center text-sm text-muted-2">
        {message}
      </td>
    </tr>
  );
}
