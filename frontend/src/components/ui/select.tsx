import * as React from "react";

export function Select({
  value,
  onChange,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="block w-full rounded-md border border-gray-300 bg-white p-2 text-sm shadow-sm focus:border-primary focus:ring focus:ring-primary/50"
      {...props}
    >
      {children}
    </select>
  );
}

export function SelectTrigger({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-gray-300 p-2">
      {children}
    </div>
  );
}

export function SelectValue({
  value
}: {
  value: string | undefined;
}) {
  return <span>{value}</span>;
}

export function SelectContent({
  children
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

export function SelectItem({
  value,
  children
}: {
  value: string;
  children: React.ReactNode;
}) {
  return <option value={value}>{children}</option>;
}
