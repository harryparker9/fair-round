import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                "glass-panel rounded-2xl p-6 text-foreground",
                className
            )}
            {...props}
        />
    )
)
Card.displayName = "Card"

export { Card }
