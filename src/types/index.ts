export interface Facility {
  state: string
  lga: string
  lga_normalized: string
  ward: string
  facility_name: string
  facility_name_raw: string
  facility_type: string
  implementing_partner: string
  imam_source: string
  imam_admissions: number
  sam_new_admission: number
  sam_cured: number
  sam_defaulters: number
  sam_death: number
  sam_non_recovered: number
  sam_transfer_out: number
  sam_transfer_in: number
  rutf_received_sachets: number
  rutf_utilized_sachets: number
  rutf_implied_sachets: number
  lmd_rutf_sachets: number
  dhis2_sam_admitted: number
  dhis2_sam_treated: number
  dhis2_cmam_admitted: number
  months_reporting: number
  cure_rate: number | null
  default_rate: number | null
  death_rate: number | null
  imam_dhis2_diff: number | null
  imam_dhis2_gap_pct: number | null
  match_status: string
  is_imam: boolean
  is_dhis2_only: boolean
  opportunity_class: string
  sampling_status: string
  sampling_stratum: string | null
}

export interface Dhis2Only {
  state: string
  lga: string
  ward: string
  facility: string
  sam_admitted: number | null
  sam_treated: number | null
  months_reporting: number | null
  match_status: string
  is_imam: boolean
  is_dhis2_only: boolean
}

export interface LgaSummary {
  state: string
  lga: string
  lga_normalized: string
  imam_facilities: number
  imam_admissions: number
  sam_cured: number
  sam_defaulters: number
  sam_death: number
  dhis2_sam_admitted: number
  dhis2_sam_treated: number
  rutf_received: number
  rutf_utilized: number
  lmd_rutf: number
  matched_facilities: number
  unmatched_facilities: number
  cure_rate: number | null
  default_rate: number | null
  death_rate: number | null
  imam_dhis2_diff: number | null
  imam_dhis2_gap_pct: number | null
  rutf_implied: number
  dhis2_only_facilities: number
  dhis2_only_admissions: number
}

export interface StateSummary {
  state: string
  imam_facilities: number
  lgas: number
  imam_admissions: number
  dhis2_admissions_matched: number | null
  imam_dhis2_diff: number | null
  imam_dhis2_gap_pct: number | null
  matched_facilities: number
  unmatched_facilities: number
  dhis2_only_facilities: number
  dhis2_only_admissions: number
  sam_cured: number
  sam_defaulters: number
  sam_deaths: number
  cure_rate: number | null
  default_rate: number | null
  death_rate: number | null
  rutf_received_sachets: number
  rutf_utilized_sachets: number
  lmd_rutf_sachets: number
  rutf_implied_sachets: number
}

export interface MonthlyTrend {
  state: string
  period: string
  sam_admissions: number
  sam_cured: number
  sam_defaulters: number
  sam_death: number
  rutf_utilized: number
  rutf_received: number
}

export type StateFilter = 'Combined' | 'Kaduna' | 'Kano'
