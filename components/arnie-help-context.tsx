"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"

export interface HelpContent {
    title: string
    content: ReactNode
}

interface ArnieHelpContextType {
    content: HelpContent
    setHelp: (content: HelpContent) => void
}

const defaultContent: HelpContent = {
    title: "How Can Arnie Help?",
    content: (
        <div className="space-y-4">
            <p>I'm your personal navigator. I'm here to ensure everything runs smoothly.</p>
            <p>If you're ever stuck, just give me a tap and I'll explain what's happening.</p>
        </div>
    )
}

const ArnieHelpContext = createContext<ArnieHelpContextType>({
    content: defaultContent,
    setHelp: () => { }
})

export function ArnieHelpProvider({ children }: { children: ReactNode }) {
    const [content, setContent] = useState<HelpContent>(defaultContent)

    return (
        <ArnieHelpContext.Provider value={{ content, setHelp: setContent }}>
            {children}
        </ArnieHelpContext.Provider>
    )
}

export function useArnieHelp() {
    return useContext(ArnieHelpContext)
}
