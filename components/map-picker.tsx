'use client'

import { useState, useCallback } from 'react'
import { APIProvider, Map, MapCameraChangedEvent } from '@vis.gl/react-google-maps'
import { Button } from '@/components/ui/button'
import { MapPin, X, Check } from 'lucide-react'

interface MapPickerProps {
    initialCenter?: { lat: number, lng: number }
    onConfirm: (location: { lat: number, lng: number }) => void
    onClose: () => void
}

const DEFAULT_CENTER = { lat: 51.5074, lng: -0.1278 } // London

export function MapPicker({ initialCenter, onConfirm, onClose }: MapPickerProps) {
    const [center, setCenter] = useState(initialCenter || DEFAULT_CENTER)
    const [isDragging, setIsDragging] = useState(false)

    // Handle Camera Move
    const handleCameraChange = useCallback((ev: MapCameraChangedEvent) => {
        setCenter(ev.detail.center)
    }, [])

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex justify-between items-center p-4 bg-charcoal border-b border-white/10 z-10">
                <h3 className="text-white font-bold text-lg">Pick Location</h3>
                <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white/60 hover:text-white">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Map Container */}
            <div className="flex-1 relative w-full h-full">
                <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
                    <Map
                        defaultCenter={initialCenter || DEFAULT_CENTER}
                        defaultZoom={13}
                        gestureHandling={'greedy'}
                        disableDefaultUI={true}
                        onCameraChanged={handleCameraChange}
                        onDragstart={() => setIsDragging(true)}
                        onDragend={() => setIsDragging(false)}
                        className="w-full h-full"
                        mapId="bf51a910020fa25a" // Optional Map ID for styling
                    />
                </APIProvider>

                {/* Center Crosshair / Pin */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 flex flex-col items-center">
                    <div className="relative">
                        <MapPin
                            className={`w-10 h-10 text-pint-gold drop-shadow-2xl transition-transform duration-200 ${isDragging ? '-translate-y-4 scale-110' : ''}`}
                            fill="black"
                        />
                        <div className="w-2 h-2 bg-black rounded-full mt-[-6px] mx-auto shadow-md"></div>
                    </div>
                </div>

                {/* Instruction */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur px-4 py-2 rounded-full pointer-events-none">
                    <p className="text-xs text-white font-medium">Move map to place pin</p>
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-charcoal border-t border-white/10 z-10 safe-area-bottom">
                <div className="flex gap-4 items-center">
                    <div className="flex-1">
                        <p className="text-xs text-white/40 uppercase tracking-widest">Coordinates</p>
                        <p className="text-sm font-mono text-white mt-1">
                            {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
                        </p>
                    </div>
                    <Button
                        onClick={() => onConfirm(center)}
                        className="bg-pint-gold text-black hover:bg-pint-gold/90 font-bold px-8 shadow-[0_0_20px_rgba(255,215,0,0.3)]"
                    >
                        <Check className="w-4 h-4 mr-2" /> Confirm Location
                    </Button>
                </div>
            </div>
        </div>
    )
}
