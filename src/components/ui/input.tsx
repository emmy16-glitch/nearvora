"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends Omit<React.ComponentProps<"input">, "size" | "prefix"> {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  containerClassName?: string;
}

export function Input({
  className,
  containerClassName,
  label,
  hint,
  error,
  prefix,
  suffix,
  id,
  "aria-describedby": describedBy,
  ...props
}: InputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  return (
    <div className={cn("w-full", containerClassName)}>
      {label ? (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-xs font-medium tracking-wide text-muted"
        >
          {label}
        </label>
      ) : null}
      <div
        className={cn(
          "flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3 transition-colors focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/10",
          error && "border-danger/60 focus-within:border-danger/70 focus-within:ring-danger/10",
          props.disabled && "opacity-50",
        )}
      >
        {prefix ? <span className="shrink-0 text-muted">{prefix}</span> : null}
        <input
          id={inputId}
          className={cn(
            "h-full w-full min-w-0 bg-transparent text-sm text-fg outline-none placeholder:text-muted-2",
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : describedBy}
          {...props}
        />
        {suffix ? <span className="shrink-0 text-muted">{suffix}</span> : null}
      </div>
      {error ? (
        <p id={messageId} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="mt-1.5 text-xs text-muted-2">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Textarea({
  className,
  label,
  error,
  hint,
  id,
  ...props
}: React.ComponentProps<"textarea"> & {
  label?: string;
  error?: string;
  hint?: string;
}) {
  const generatedId = React.useId();
  const textareaId = id ?? generatedId;
  return (
    <div>
      {label ? (
        <label htmlFor={textareaId} className="mb-1.5 block text-xs font-medium text-muted">
          {label}
        </label>
      ) : null}
      <textarea
        id={textareaId}
        className={cn(
          "min-h-24 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-fg outline-none transition-colors placeholder:text-muted-2 focus:border-accent/60 focus:ring-2 focus:ring-accent/10",
          error && "border-danger/60",
          className,
        )}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted-2">{hint}</p>
      ) : null}
    </div>
  );
}

export function Select({
  className,
  label,
  error,
  hint,
  children,
  id,
  ...props
}: React.ComponentProps<"select"> & {
  label?: string;
  error?: string;
  hint?: string;
}) {
  const generatedId = React.useId();
  const selectId = id ?? generatedId;
  return (
    <div>
      {label ? (
        <label htmlFor={selectId} className="mb-1.5 block text-xs font-medium text-muted">
          {label}
        </label>
      ) : null}
      <select
        id={selectId}
        className={cn(
          "h-11 w-full appearance-none rounded-xl border border-line bg-surface px-3 text-sm text-fg outline-none transition-colors focus:border-accent/60 focus:ring-2 focus:ring-accent/10",
          error && "border-danger/60",
          className,
        )}
        aria-invalid={error ? true : undefined}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted-2">{hint}</p>
      ) : null}
    </div>
  );
}
