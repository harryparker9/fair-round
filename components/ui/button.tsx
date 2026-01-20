import * as React from "react"
import { cn } from "@/lib/utils"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "glass" | "ghost"
    size?: "sm" | "md" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center rounded-full font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pint-gold disabled:pointer-events-none disabled:opacity-50 active:scale-95",
                    {
                        "bg-pint-gold text-black hover:bg-yellow-400 shadow-[0_0_15px_rgba(255,215,0,0.3)]": variant === "primary",
                        "bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/10": variant === "glass",
                        "bg-charcoal text-white border border-white/20 hover:bg-white/5": variant === "secondary",
                        "hover:bg-white/5 text-white": variant === "ghost",

                        "h-9 px-4 text-sm": size === "sm",
                        "h-11 px-6 text-base": size === "md",
                        "h-14 px-8 text-lg": size === "lg",
                    },
                    className
                )}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
