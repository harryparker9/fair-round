"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface DialogProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children: React.ReactNode
}

const DialogContext = React.createContext<DialogProps | null>(null)

export function Dialog({ open, onOpenChange, children }: DialogProps) {
    return (
        <DialogContext.Provider value={{ open, onOpenChange, children }}>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {children}
                </div>
            )}
        </DialogContext.Provider>
    )
}

export function DialogContent({ className, children }: { className?: string, children: React.ReactNode }) {
    const context = React.useContext(DialogContext)
    if (!context) throw new Error("DialogContent must be used within Dialog")

    // Close on click outside (backdrop)
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && context.onOpenChange) {
            context.onOpenChange(false)
        }
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-all animate-in fade-in duration-200"
                onClick={handleBackdropClick}
            />
            {/* Content */}
            <div className={cn(
                "relative z-50 flex w-full flex-col bg-charcoal text-white border border-white/10 shadow-lg duration-200 animate-in fade-in-0 zoom-in-95 rounded-xl sm:rounded-lg",
                className
            )}>
                {children}
            </div>
        </>
    )
}
