import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { logger } from '@/lib/logger'

export interface Referrer {
  id: number
  referrer_key: number
  referrer_name: string
  provider_number: string | null
  specialities: string | null
  email: string | null
  phone: string | null
  clinic_key: number | null
  clinic_name: string | null
  suburb: string | null
  state: string | null
  nearest_location_id: string | null
  nearest_location?: {
    id: string
    name: string
    city: string | null
    state: string | null
  } | null
  // Enriched clinic contact details
  clinic_phone?: string | null
  clinic_address?: string | null
  clinic_postcode?: string | null
}

export interface Clinic {
  id: number
  clinic_key: number
  clinic_name: string
  clinic_phone: string | null
  address: string | null
  suburb: string | null
  state: string | null
  postcode: string | null
  referrer_count: number
}

export interface SyncStatus {
  lastSync: string | null
  referrerCount: number
  clinicCount: number
  status: string | null
}

export function useReferrerSearch() {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchType, setSearchType] = useState<'referrer' | 'clinic'>('referrer')
  const [referrerResults, setReferrerResults] = useState<Referrer[]>([])
  const [clinicResults, setClinicResults] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSync: null,
    referrerCount: 0,
    clinicCount: 0,
    status: null
  })

  // Fetch sync status on mount
  const fetchSyncStatus = useCallback(async () => {
    try {
      const [historyResult, referrerCountResult, clinicCountResult] = await Promise.all([
        supabase
          .from('referrer_sync_history')
          .select('completed_at, status, referrer_count, clinic_count')
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from('referrer_directory')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('clinic_directory')
          .select('id', { count: 'exact', head: true })
      ])

      setSyncStatus({
        lastSync: historyResult.data?.completed_at || null,
        referrerCount: referrerCountResult.count || 0,
        clinicCount: clinicCountResult.count || 0,
        status: historyResult.data?.status || null
      })
    } catch (error) {
      logger.error('Error fetching sync status', error)
    }
  }, [])

  useEffect(() => {
    fetchSyncStatus()
  }, [fetchSyncStatus])

  useEffect(() => {
    if (searchTerm.length < 2) {
      setReferrerResults([])
      setClinicResults([])
      return
    }

    const search = async () => {
      setLoading(true)

      // Format search term for Postgres full-text search with prefix matching
      // Split by whitespace, add :* to each word for prefix search, join with &
      const searchQuery = searchTerm
        .trim()
        .split(/\s+/)
        .map(word => `${word}:*`)
        .join(' & ')

      try {
        if (searchType === 'referrer') {
          // Try full-text search first
          let { data, error } = await supabase
            .from('referrer_directory')
            .select(`
              *,
              nearest_location:locations!referrer_directory_nearest_location_id_fkey(
                id, name, city, state
              )
            `)
            .textSearch('search_vector', searchQuery)
            .limit(50)
          
          if (error) throw error
          
          // If no results, fallback to ILIKE search on referrer_name
          if (!data || data.length === 0) {
            const ilikeTerm = `%${searchTerm.trim().replace(/\s+/g, '%')}%`
            const fallback = await supabase
              .from('referrer_directory')
              .select(`
                *,
                nearest_location:locations!referrer_directory_nearest_location_id_fkey(
                  id, name, city, state
                )
              `)
              .ilike('referrer_name', ilikeTerm)
              .limit(50)
            
            if (!fallback.error) {
              data = fallback.data
            }
          }
          
          // Enrich referrer results with clinic contact details
          const enrichedData = await enrichReferrersWithClinicDetails(data || [])
          setReferrerResults(enrichedData)
          setClinicResults([])
        } else {
          // Try full-text search first
          let { data, error } = await supabase
            .from('clinic_directory')
            .select('*')
            .textSearch('search_vector', searchQuery)
            .order('referrer_count', { ascending: false })
            .limit(50)
          
          if (error) throw error
          
          // If no results, fallback to ILIKE search on clinic_name
          if (!data || data.length === 0) {
            const ilikeTerm = `%${searchTerm.trim().replace(/\s+/g, '%')}%`
            const fallback = await supabase
              .from('clinic_directory')
              .select('*')
              .ilike('clinic_name', ilikeTerm)
              .order('referrer_count', { ascending: false })
              .limit(50)
            
            if (!fallback.error) {
              data = fallback.data
            }
          }
          
          setClinicResults(data || [])
          setReferrerResults([])
        }
      } catch (error) {
        logger.error('Search error', error)
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(search, 300)
    return () => clearTimeout(debounce)
  }, [searchTerm, searchType])

  // Helper to enrich referrer results with clinic contact details
  const enrichReferrersWithClinicDetails = async (referrers: Referrer[]): Promise<Referrer[]> => {
    if (referrers.length === 0) return referrers
    
    // Get unique clinic keys
    const clinicKeys = [...new Set(referrers.map(r => r.clinic_key).filter(Boolean))] as number[]
    
    if (clinicKeys.length === 0) return referrers
    
    // Fetch clinic details
    const { data: clinics } = await supabase
      .from('clinic_directory')
      .select('clinic_key, clinic_phone, address, postcode')
      .in('clinic_key', clinicKeys)
    
    if (!clinics) return referrers
    
    // Create a map for quick lookup
    const clinicMap = new Map(clinics.map(c => [c.clinic_key, c]))
    
    // Enrich referrers with clinic details
    return referrers.map(referrer => {
      if (referrer.clinic_key) {
        const clinic = clinicMap.get(referrer.clinic_key)
        if (clinic) {
          return {
            ...referrer,
            clinic_phone: clinic.clinic_phone,
            clinic_address: clinic.address,
            clinic_postcode: clinic.postcode,
          }
        }
      }
      return referrer
    })
  }

  const getClinicReferrers = useCallback(async (clinicKey: number): Promise<Referrer[]> => {
    const { data, error } = await supabase
      .from('referrer_directory')
      .select(`
        *,
        nearest_location:locations!referrer_directory_nearest_location_id_fkey(
          id, name, city, state
        )
      `)
      .eq('clinic_key', clinicKey)
      .order('referrer_name')
    
    if (error) {
      logger.error('Error fetching clinic referrers', error)
      return []
    }
    
    // Enrich with clinic details
    return enrichReferrersWithClinicDetails(data || [])
  }, [])

  // Get all clinic associations for a specific referrer
  const getReferrerClinics = useCallback(async (referrerKey: number): Promise<Referrer[]> => {
    const { data, error } = await supabase
      .from('referrer_directory')
      .select(`
        *,
        nearest_location:locations!referrer_directory_nearest_location_id_fkey(
          id, name, city, state
        )
      `)
      .eq('referrer_key', referrerKey)
      .order('clinic_name')
    
    if (error) {
      logger.error('Error fetching referrer clinics', error)
      return []
    }
    
    // Enrich with clinic details
    return enrichReferrersWithClinicDetails(data || [])
  }, [])

  return {
    searchTerm,
    setSearchTerm,
    searchType,
    setSearchType,
    referrerResults,
    clinicResults,
    loading,
    getClinicReferrers,
    getReferrerClinics,
    syncStatus,
    refreshSyncStatus: fetchSyncStatus,
  }
}
