import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const baseClassName =
  "inline-flex items-center justify-center gap-2 rounded-2xl border text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400/40 disabled:pointer-events-none disabled:opacity-50";

const variantClassNames: Record<ButtonVariant, string> = {
  primary:
    "border-sky-400/20 bg-[linear-gradient(135deg,#0f6cbd_0%,#14b8a6_100%)] text-white shadow-[0_16px_32px_rgba(15,108,189,0.24)] hover:brightness-110",
  secondary:
    "border-white/10 bg-white/[0.06] text-slate-100 hover:bg-white/[0.1]",
  ghost: "border-transparent bg-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.06] hover:text-white",
  danger:
    "border-rose-400/20 bg-[linear-gradient(135deg,#be123c_0%,#ef4444_100%)] text-white shadow-[0_16px_32px_rgba(190,24,60,0.22)] hover:brightness-110",
};

const sizeClassNames: Record<ButtonSize, string> = {
  sm: "min-h-8 px-4",
  md: "min-h-10 px-4",
  lg: "min-h-12 px-6",
};

type CommonProps = {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

type LinkButtonProps = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

type NativeButtonProps = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
  };

export function Button(props: LinkButtonProps | NativeButtonProps) {
  if (typeof props.href === "string") {
    const {
      className,
      variant = "secondary",
      size = "md",
      children,
      href,
      ...rest
    } = props;

    const resolvedClassName = cn(baseClassName, variantClassNames[variant], sizeClassNames[size], className);

    return (
      <Link href={href} className={resolvedClassName} {...rest}>
        {children}
      </Link>
    );
  }

  const {
    className,
    variant = "secondary",
    size = "md",
    children,
    ...rest
  } = props;

  const resolvedClassName = cn(baseClassName, variantClassNames[variant], sizeClassNames[size], className);

  return (
    <button {...rest} className={resolvedClassName}>
      {children}
    </button>
  );
}