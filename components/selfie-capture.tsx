'use client'

import React, { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Camera, RefreshCw } from 'lucide-react'

interface SelfieCaptureProps {
    onCapture: (blob: Blob) => void
    disabled?: boolean
}

export function SelfieCapture({ onCapture, disabled }: SelfieCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [stream, setStream] = useState<MediaStream | null>(null)
    const [capturedImage, setCapturedImage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', aspectRatio: 1 }, // Square aspect ratio ideal
                audio: false,
            })
            setStream(mediaStream)
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream
            }
            setError(null)
        } catch (err) {
            console.error("Camera access denied:", err)
            setError("Please allow camera access to join.")
        }
    }

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
            setStream(null)
        }
    }

    useEffect(() => {
        startCamera()
        return () => stopCamera()
    }, []) // Start on mount

    const capture = () => {
        if (!videoRef.current || !canvasRef.current) return

        const video = videoRef.current
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        if (!context) return

        // Square crop logic
        const size = Math.min(video.videoWidth, video.videoHeight)
        const xOffset = (video.videoWidth - size) / 2
        const yOffset = (video.videoHeight - size) / 2

        canvas.width = size
        canvas.height = size

        context.drawImage(video, xOffset, yOffset, size, size, 0, 0, size, size)

        canvas.toBlob((blob) => {
            if (blob) {
                onCapture(blob)
                setCapturedImage(URL.createObjectURL(blob))
                stopCamera()
            }
        }, 'image/jpeg', 0.8)
    }

    const retake = () => {
        setCapturedImage(null)
        startCamera()
    }

    if (error) {
        return (
            <div className="w-48 h-48 rounded-full bg-white/10 flex items-center justify-center border-2 border-dashed border-white/20">
                <p className="text-xs text-center px-4 text-red-400">{error}</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)] bg-black">
                {!capturedImage ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
                    />
                ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={capturedImage} alt="Selfie" className="w-full h-full object-cover transform scale-x-[-1]" />
                )}
            </div>

            <div className="flex gap-2">
                {!capturedImage ? (
                    <Button
                        type="button"
                        onClick={capture}
                        disabled={disabled || !stream}
                        variant="glass"
                        className="rounded-full w-12 h-12 p-0 flex items-center justify-center border-pint-gold/50 text-pint-gold hover:bg-pint-gold hover:text-black transition-all"
                    >
                        <Camera className="w-6 h-6" />
                    </Button>
                ) : (
                    <Button
                        type="button"
                        onClick={retake}
                        disabled={disabled}
                        variant="glass"
                        className="rounded-full w-12 h-12 p-0 flex items-center justify-center hover:bg-white/20"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </Button>
                )}
            </div>

            <canvas ref={canvasRef} className="hidden" />
        </div>
    )
}
