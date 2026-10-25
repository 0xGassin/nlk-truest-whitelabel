"use client";

import type { ControllerProps, FieldPath, FieldValues } from "react-hook-form";

import { Slot } from "@radix-ui/react-slot";
import { use } from "react";
import * as React from "react";
import { Controller, FormProvider, useFormContext } from "react-hook-form";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const Form = FormProvider;

interface FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  name: TName;
}

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext>
  );
};

const useFormField = () => {
  const fieldContext = use(FormFieldContext);
  const itemContext = use(FormItemContext);
  const { formState, getFieldState } = useFormContext();

  const fieldState = getFieldState(fieldContext.name, formState);

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }

  const { id } = itemContext;

  return {
    formDescriptionId: `${id}-form-item-description`,
    formItemId: `${id}-form-item`,
    formMessageId: `${id}-form-item-message`,
    id,
    name: fieldContext.name,
    ...fieldState,
  };
};

interface FormItemContextValue {
  id: string;
}

const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue);

// eslint-disable-next-line @eslint-react/no-forward-ref
const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = React.useId();

    return (
      <FormItemContext value={{ id }}>
        <div className={cn("space-y-2", className)} ref={ref} {...props} />
      </FormItemContext>
    );
  },
);
FormItem.displayName = "FormItem";

// eslint-disable-next-line @eslint-react/no-forward-ref
const FormLabel = React.forwardRef<React.ComponentRef<typeof Label>, React.ComponentPropsWithoutRef<typeof Label>>(
  ({ className, ...props }, ref) => {
    const { error, formItemId } = useFormField();

    return <Label className={cn(error && "text-destructive", className)} htmlFor={formItemId} ref={ref} {...props} />;
  },
);
FormLabel.displayName = "FormLabel";

// eslint-disable-next-line @eslint-react/no-forward-ref
const FormControl = React.forwardRef<React.ComponentRef<typeof Slot>, React.ComponentPropsWithoutRef<typeof Slot>>(
  ({ ...props }, ref) => {
    const { error, formDescriptionId, formItemId, formMessageId } = useFormField();

    return (
      <Slot
        aria-describedby={error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId}
        aria-invalid={!!error}
        id={formItemId}
        ref={ref}
        {...props}
      />
    );
  },
);
FormControl.displayName = "FormControl";

// eslint-disable-next-line @eslint-react/no-forward-ref
const FormDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    const { formDescriptionId } = useFormField();

    return <p className={cn("text-sm text-muted-foreground", className)} id={formDescriptionId} ref={ref} {...props} />;
  },
);
FormDescription.displayName = "FormDescription";

// eslint-disable-next-line @eslint-react/no-forward-ref
const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ children, className, ...props }, ref) => {
    const { error, formMessageId } = useFormField();
    const body = error ? String(error.message) : children;

    if (!body) {
      return null;
    }

    return (
      <p className={cn("text-sm font-medium text-destructive", className)} id={formMessageId} ref={ref} {...props} />
    );
  },
);
FormMessage.displayName = "FormMessage";

export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField };
