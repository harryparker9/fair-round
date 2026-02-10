import { useState, useEffect } from 'react'
import { PartyMember } from '@/types'

export function useGeocodedNames(members: PartyMember[]) {
    const [names, setNames] = useState<Record<string, string>>({})

    useEffect(() => {
        const fetchLocationNames = async () => {
            if (typeof google === 'undefined') return

            const geocoder = new google.maps.Geocoder()
            const newNames: Record<string, string> = {}

            // Find members who need geocoding (live or custom locations without a nice address)
            // We generally trust 'station' types mostly, but 'live' often has a rough address. 
            // If address is missing or generic "Pinned Location", we geocode.
            const targets = members.filter(m => {
                const needsStart = (m.start_location_type === 'custom' || m.start_location_type === 'live') && (!m.location?.address || m.location.address === 'Pinned Location')
                const needsEnd = m.end_location_type === 'custom'
                return needsStart || needsEnd
            })

            await Promise.all(targets.map(async (m) => {
                try {
                    // 1. Start Location
                    if ((m.start_location_type === 'custom' || m.start_location_type === 'live') && m.location) {
                        const response = await geocoder.geocode({ location: { lat: m.location.lat, lng: m.location.lng } })
                        if (response.results[0]) {
                            const locality = getLocality(response.results[0])
                            newNames[`${m.id}_start`] = `Near ${locality}`
                        }
                    }

                    // 2. End Location
                    if (m.end_location_type === 'custom' && m.end_lat && m.end_lng) {
                        const response = await geocoder.geocode({ location: { lat: m.end_lat, lng: m.end_lng } })
                        if (response.results[0]) {
                            const locality = getLocality(response.results[0])
                            newNames[`${m.id}_end`] = `Near ${locality}`
                        }
                    }

                } catch (e) {
                    console.error("Geocoding failed for member", m.id, e)
                }
            }))

            if (Object.keys(newNames).length > 0) {
                setNames(prev => ({ ...prev, ...newNames }))
            }
        }

        if (members.length > 0) {
            if (typeof google !== 'undefined') {
                fetchLocationNames()
            } else {
                // Poll for Google API (it might be loading in background via APIProvider)
                const interval = setInterval(() => {
                    if (typeof google !== 'undefined') {
                        clearInterval(interval)
                        fetchLocationNames()
                    }
                }, 500)
                return () => clearInterval(interval)
            }
        }
    }, [members])

    const getLocality = (result: google.maps.GeocoderResult) => {
        return result.address_components.find(c => c.types.includes('neighborhood'))?.long_name
            || result.address_components.find(c => c.types.includes('locality'))?.long_name
            || result.address_components.find(c => c.types.includes('postal_town'))?.long_name
            || "London Area"
    }

    const getStartName = (member: PartyMember) => {
        if (member.start_location_type === 'station') return null // Should be handled by station map
        if (names[`${member.id}_start`]) return names[`${member.id}_start`]
        if (member.location?.address && member.location.address !== 'Pinned Location') return member.location.address
        return "Pinned Location" // Fallback until loaded
    }

    const getEndName = (member: PartyMember) => {
        if (member.end_location_type === 'station') return null
        if (names[`${member.id}_end`]) return names[`${member.id}_end`]
        return "Custom Location"
    }

    return { names, getStartName, getEndName }
}
