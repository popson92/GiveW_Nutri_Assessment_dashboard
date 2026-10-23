# GiveWell SAM Treatment Assessment Dashboard

Interactive analytics dashboard for the Severe Acute Malnutrition (SAM) treatment assessment across Kaduna and Kano States, Nigeria. Built for GiveWell's evaluation of IMAM (Integrated Management of Acute Malnutrition) programme performance.

**Implementation:** Solina Health / SCIDaR  
**Period:** September 2024 – August 2026

## Dashboard Sections

1. **Executive Overview** — KPI cards, state comparison, outcomes breakdown, top LGAs
2. **Geographic Intelligence** — Interactive choropleth map with 6 selectable metrics, LGA rankings
3. **Admissions Reconciliation** — IMAM vs DHIS2 facility-level scatter plots, gap distribution analysis
4. **Treatment Outcomes** — SPHERE standard benchmarks (cure ≥75%, default <15%, CFR <10%), volume vs quality analysis
5. **RUTF Supply Analysis** — Three-way comparison of IMAM utilisation, LMD distribution, and admissions-implied requirements
6. **Treatment Footprint** — IMAM-designated vs DHIS2-only facilities, coverage gaps by LGA
7. **Sampling Intelligence** — Certainty stratum facilities, positive/negative gap strata
8. **Opportunity Classification** — Facility classification (Functioning, Moderate, Quality Concern, Needs Reconciliation, Insufficient Data)
9. **Facility Explorer** — Searchable, sortable, filterable database of all 650 facilities with CSV export

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- ECharts (charts and visualisations)
- Leaflet (interactive maps)
- Deployed on Netlify

## Data Sources

- **IMAM Sampling Frame v5** — 650 facilities (166 Kaduna, 484 Kano) with admissions, outcomes, and RUTF data
- **DHIS2 SAM Facility Reports** — 457 reporting facilities matched against IMAM records
- **DHIS2-Only Facilities** — 333 facilities reporting to DHIS2 but not in IMAM programme lists
- **LMD RUTF Distribution Records** — Last Mile Distribution tracking
- **Kaduna LGA Reconciliation** — Authoritative 23-LGA reconciliation totals
- **GADM Boundaries** — LGA-level shapefile converted to GeoJSON (67 features)

## Getting Started

```bash
npm install
npm run dev     # Development server at http://localhost:5173
npm run build   # Production build to dist/
```

## Data Processing

The `scripts/data_processing/process_all.py` script reads raw Excel/CSV source files and outputs aggregated JSON to `public/data/` and GeoJSON to `public/geo/`. Raw source data is not included in the repository.

## Deployment

Configured for Netlify with `netlify.toml`. The `dist/` folder is the publish directory with SPA redirect rules for client-side routing.
