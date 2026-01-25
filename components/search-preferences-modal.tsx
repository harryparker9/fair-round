"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"

interface SearchPreferencesModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (prefs: { radius: number, filters: string[] }) => void
    isLoading?: boolean
}

const COMMON_TAGS = [
    "Beer Garden", "Cocktails", "Craft Beer", "Cheap", "Live Sports", "Food", "Cosy", "Rooftop"
]

export function SearchPreferencesModal({ open, onOpenChange, onConfirm, isLoading }: SearchPreferencesModalProps) {
    const [radius, setRadius] = useState([0.5]) // Default 500m
    const [selectedTags, setSelectedTags] = useState<string[]>([])

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag))
        } else {
            setSelectedTags([...selectedTags, tag])
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-charcoal border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle>Customize Search</DialogTitle>
                    <DialogDescription className="text-white/60">
                        Help AI find the perfect spot near your chosen station.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Distance Slider */}
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <label className="text-sm font-bold uppercase tracking-wider text-white/60">Max Walking Distance</label>
                            <span className="text-sm font-mono text-pint-gold font-bold">{radius[0]} km</span>
                        </div>
                        <Slider
                            value={radius}
                            onValueChange={setRadius}
                            max={1.5}
                            min={0.1}
                            step={0.1}
                            className="py-4"
                        />
                        <p className="text-xs text-white/40 italic text-right">
                            {radius[0] < 0.4 ? "Lazy walk" : radius[0] > 1.0 ? "A bit of a trek" : "Standard walk"}
                        </p>
                    </div>

                    {/* Tags */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold uppercase tracking-wider text-white/60">Vibe Check</label>
                        <div className="flex flex-wrap gap-2">
                            {COMMON_TAGS.map(tag => {
                                const isSelected = selectedTags.includes(tag)
                                return (
                                    <button
                                        key={tag}
                                        onClick={() => toggleTag(tag)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${isSelected
                                                ? "bg-pint-gold text-charcoal border-pint-gold shadow-[0_0_10px_rgba(255,215,0,0.3)]"
                                                : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/30"
                                            }`}
                                    >
                                        {tag}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => onConfirm({ radius: radius[0] * 1000, filters: selectedTags })}
                        disabled={isLoading}
                        className="w-full sm:w-auto"
                    >
                        {isLoading ? "Triangulating..." : "Find Pubs"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
