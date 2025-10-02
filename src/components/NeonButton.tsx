import { ButtonHTMLAttributes } from "react";

type NeonButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

export function NeonButton({ label, className = "", ...rest }: NeonButtonProps) {
  return (
    <button
      className={`relative inline-flex items-center justify-center rounded-md px-5 py-2.5 text-[15px] font-semibold tracking-wide text-black transition-transform duration-200 will-change-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] bg-[var(--color-neon)] shadow-[0_0_12px_rgba(57,255,20,0.6),0_0_48px_rgba(57,255,20,0.35)] ring-[var(--color-neon)] ring-0 ${className}`}
      {...rest}
    >
      {label}
    </button>
  );
}


