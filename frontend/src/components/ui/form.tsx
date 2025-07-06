import * as React from "react";
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
  type ControllerRenderProps,
  type ControllerFieldState,
  type UseFormStateReturn,
} from "react-hook-form";
import { cn } from "@/lib/utils";

export function Form({
  children,
  ...props
}: React.FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form className="space-y-6" {...props}>
      {children}
    </form>
  );
}

export function FormItem({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-2", className)} {...props} />
  );
}

export function FormLabel({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    />
  );
}

export function FormControl({
  children
}: {
  children: React.ReactNode;
}) {
  return children;
}

export function FormMessage({
  message
}: {
  message?: string;
}) {
  if (!message) return null;
  return (
    <p className="text-sm font-medium text-destructive">
      {message}
    </p>
  );
}

export function FormField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>
>({
  name,
  control,
  render
}: {
  name: TName;
  control: Control<TFieldValues>;
  render: (props: {
    field: ControllerRenderProps<TFieldValues, TName>;
    fieldState: ControllerFieldState;
    formState: UseFormStateReturn<TFieldValues>;
  }) => React.ReactElement;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState, formState }) =>
        render({ field, fieldState, formState })
      }
    />
  );
}
