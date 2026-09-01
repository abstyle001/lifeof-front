import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const dialogVariants = cva("fixed z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%]", {
  variants: {
    size: {
      sm: "max-w-sm",
      md: "max-w-lg",
      lg: "max-w-2xl",
      xl: "max-w-4xl",
      full: "max-w-[90vw]",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = DialogPrimitive.Overlay;
const DialogContentPrimitive = DialogPrimitive.Content;
const DialogTitlePrimitive = DialogPrimitive.Title;
const DialogDescriptionPrimitive = DialogPrimitive.Description;

export interface DialogProps extends ComponentProps<typeof DialogPrimitive.Root> {}
export interface DialogTriggerProps extends ComponentProps<typeof DialogPrimitive.Trigger> {}
export interface DialogPortalProps extends ComponentProps<typeof DialogPrimitive.Portal> {}
export interface DialogCloseProps extends ComponentProps<typeof DialogPrimitive.Close> {}
export interface DialogOverlayProps extends ComponentProps<typeof DialogPrimitive.Overlay> {}
export interface DialogContentProps
  extends ComponentProps<typeof DialogPrimitive.Content>, VariantProps<typeof dialogVariants> {}
export interface DialogHeaderProps extends HTMLAttributes<HTMLDivElement> {}
export interface DialogFooterProps extends HTMLAttributes<HTMLDivElement> {}
export interface DialogTitleProps extends ComponentProps<typeof DialogPrimitive.Title> {}
export interface DialogDescriptionProps extends ComponentProps<
  typeof DialogPrimitive.Description
> {}

function DialogContent({ className, size, children, ...props }: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50" />
      <DialogContentPrimitive
        className={cn(
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 bg-background p-6 shadow-lg rounded-xl",
          dialogVariants({ size }),
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary data-[state=open]:text-secondary-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </DialogPrimitive.Close>
      </DialogContentPrimitive>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: DialogFooterProps) {
  return (
    <div
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: DialogTitleProps) {
  return (
    <DialogTitlePrimitive
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return (
    <DialogDescriptionPrimitive
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
