import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'icon';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    
    const variants = {
      default: "bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/10",
      outline: "border border-white/10 bg-transparent hover:bg-white/5 text-zinc-300",
      secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
      ghost: "bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white",
      link: "text-emerald-500 underline-offset-4 hover:underline",
      icon: "p-2 rounded-full border border-white/10 hover:bg-white/5"
    }

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-8 px-3 text-xs",
      lg: "h-12 px-8 text-base",
      icon: "h-10 w-10 p-0 flex items-center justify-center"
    }

    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold transition-all disabled:pointer-events-none disabled:opacity-50 active:scale-95",
          variants[variant as keyof typeof variants] || variants.default,
          sizes[size as keyof typeof sizes] || sizes.default,
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
