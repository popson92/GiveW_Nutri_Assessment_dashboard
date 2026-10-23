"""
GiveWell SAM Treatment Assessment — Master Data Processing Pipeline
Processes Kaduna + Kano source files into clean analytical JSON for the dashboard.
"""

import sys
sys.path.insert(0, r'C:\Users\Saheed Popoola\AppData\Roaming\Python\Python312\site-packages')

import csv
import json
import os
import re
from collections import defaultdict
from pathlib import Path

import openpyxl

# Paths
DATA_DIR = Path(r"C:\Users\Saheed Popoola\Downloads\GiveWell MalNutrition Assessment_diagnostics_In_kano_kaduna_states")
OUT_DIR = Path(r"C:\Users\Saheed Popoola\Downloads\GiveW_Nutri_Assessment_dashboard\public\data")
GEO_DIR = Path(r"C:\Users\Saheed Popoola\Downloads\GiveW_Nutri_Assessment_dashboard\public\geo")

OUT_DIR.mkdir(parents=True, exist_ok=True)
GEO_DIR.mkdir(parents=True, exist_ok=True)

RUTF_SACHETS_PER_CHILD = 150

def safe_int(v):
    if v is None: return None
    try: return int(float(v))
    except: return None

def safe_float(v):
    if v is None: return None
    try: return round(float(v), 2)
    except: return None

def clean_lga(name):
    if not name: return ""
    s = str(name).strip()
    s = re.sub(r'^kd\s+', '', s, flags=re.IGNORECASE)
    s = re.sub(r'\s+Local Government Area$', '', s, flags=re.IGNORECASE)
    s = re.sub(r'\s+Local Government$', '', s, flags=re.IGNORECASE)
    return s.strip()

def clean_facility(name):
    if not name: return ""
    s = str(name).strip()
    s = re.sub(r'^kd\s+', '', s, flags=re.IGNORECASE)
    return s.strip()

def normalize_lga(name):
    """Standardize LGA names for matching across datasets."""
    s = clean_lga(name).upper().strip()
    mapping = {
        "B/GWARI": "BIRNIN GWARI",
        "BIRNIN GWARI": "BIRNIN GWARI",
        "CHIKUN": "CHIKUN",
        "GIWA": "GIWA",
        "IGABI": "IGABI",
        "IKARA": "IKARA",
        "JAMAA": "JEMA'A",
        "JEMA'A": "JEMA'A",
        "JABA": "JABA",
        "K/NORTH": "KADUNA NORTH",
        "KADUNA NORTH": "KADUNA NORTH",
        "K/SOUTH": "KADUNA SOUTH",
        "KADUNA SOUTH": "KADUNA SOUTH",
        "KACHIA": "KACHIA",
        "KAGARKO": "KAGARKO",
        "KAJURU": "KAJURU",
        "KAURA": "KAURA",
        "KAURU": "KAURU",
        "KUBAU": "KUBAU",
        "KUDAN": "KUDAN",
        "LERE": "LERE",
        "MAKARFI": "MAKARFI",
        "S/GARI": "SABON GARI",
        "S/GARI": "SABON GARI",
        "SABON GARI": "SABON GARI",
        "SOBA": "SOBA",
        "SANGA": "SANGA",
        "ZARIA": "ZARIA",
        "ZANGON KATAF": "ZANGON KATAF",
    }
    return mapping.get(s, s)


# ============================================================
# 1. Process IMAM Sampling Frame (monthly data for both states)
# ============================================================
print("Processing Sampling Frame v5...")
wb = openpyxl.load_workbook(DATA_DIR / "Sampling_" / "Sampling_Frame_v5.xlsx", read_only=True, data_only=True)
ws = wb["Frame"]

headers = [str(c.value).strip() if c.value else f"col_{i}" for i, c in enumerate(ws[1])]

# Collect monthly rows
imam_rows = []
for row in ws.iter_rows(min_row=2, values_only=True):
    if row[3] is None:
        continue
    r = dict(zip(headers, row))
    imam_rows.append(r)
wb.close()

# Aggregate to facility level
facility_data = defaultdict(lambda: {
    "state": "", "lga": "", "ward": "", "facility_name": "",
    "facility_name_raw": "", "facility_type": "", "implementing_partner": "",
    "imam_source": "",
    "sam_new_admission": 0, "sam_cured": 0, "sam_defaulters": 0,
    "sam_death": 0, "sam_non_recovered": 0, "sam_transfer_out": 0,
    "sam_transfer_in": 0,
    "rutf_received_sachets": 0, "rutf_utilized_sachets": 0,
    "dhis2_sam_admitted": 0, "dhis2_sam_treated": 0,
    "dhis2_cmam_admitted": 0, "lmd_rutf_sachets": 0,
    "months_reporting": 0, "months": set(),
})

for r in imam_rows:
    state = str(r.get("state", ""))
    lga = str(r.get("lga", ""))
    fac = str(r.get("facility_name", ""))
    key = (state, lga, fac)

    d = facility_data[key]
    d["state"] = state
    d["lga"] = lga
    d["ward"] = str(r.get("ward", "")) or d["ward"]
    d["facility_name"] = fac
    d["facility_name_raw"] = str(r.get("facility_name_raw", "")) or d["facility_name_raw"]
    d["facility_type"] = str(r.get("facility_type", "")) or d["facility_type"]
    d["implementing_partner"] = str(r.get("implementing_partner", "")) or d["implementing_partner"]
    d["imam_source"] = str(r.get("imam_source", "")) or d["imam_source"]

    d["sam_new_admission"] += safe_int(r.get("sam_new_admission")) or 0
    d["sam_cured"] += safe_int(r.get("sam_cured")) or 0
    d["sam_defaulters"] += safe_int(r.get("sam_defaulters")) or 0
    d["sam_death"] += safe_int(r.get("sam_death")) or 0
    d["sam_non_recovered"] += safe_int(r.get("sam_non_recovered")) or 0
    d["sam_transfer_out"] += safe_int(r.get("sam_transfer_out")) or 0
    d["sam_transfer_in"] += safe_int(r.get("sam_transfer_in")) or 0
    d["rutf_received_sachets"] += safe_int(r.get("rutf_received_sachets")) or 0
    d["rutf_utilized_sachets"] += safe_int(r.get("rutf_utilized_sachets")) or 0
    d["lmd_rutf_sachets"] += safe_int(r.get("lmd_rutf_sachets")) or 0

    # DHIS2 fields (aggregated from monthly where available)
    d["dhis2_sam_admitted"] += safe_int(r.get("dhis2_sam_admitted")) or 0
    d["dhis2_sam_treated"] += safe_int(r.get("dhis2_sam_treated")) or 0
    d["dhis2_cmam_admitted"] += safe_int(r.get("dhis2_cmam_admitted")) or 0

    # Track months
    yr = r.get("year")
    mn = r.get("month_num")
    if yr and mn:
        d["months"].add((int(yr), int(mn)))

# Build facility list
facilities = []
for key, d in facility_data.items():
    d["months_reporting"] = len(d["months"])
    del d["months"]

    # Normalize LGA for display
    d["lga_normalized"] = normalize_lga(d["lga"])

    # Compute rates (use pooled counts)
    total_exits = d["sam_cured"] + d["sam_defaulters"] + d["sam_death"] + d["sam_non_recovered"] + d["sam_transfer_out"]
    if total_exits > 0:
        d["cure_rate"] = round(d["sam_cured"] / total_exits * 100, 1)
        d["default_rate"] = round(d["sam_defaulters"] / total_exits * 100, 1)
        d["death_rate"] = round(d["sam_death"] / total_exits * 100, 1)
    else:
        d["cure_rate"] = None
        d["default_rate"] = None
        d["death_rate"] = None

    # IMAM-DHIS2 gap (only if DHIS2 data exists in the frame)
    imam_adm = d["sam_new_admission"]
    dhis2_adm = d["dhis2_sam_admitted"]
    d["imam_admissions"] = imam_adm
    if dhis2_adm > 0:
        d["imam_dhis2_diff"] = imam_adm - dhis2_adm
        d["imam_dhis2_gap_pct"] = round((imam_adm - dhis2_adm) / imam_adm * 100, 1) if imam_adm > 0 else None
    else:
        d["imam_dhis2_diff"] = None
        d["imam_dhis2_gap_pct"] = None

    # RUTF implied requirements
    d["rutf_implied_sachets"] = imam_adm * RUTF_SACHETS_PER_CHILD

    # Match status placeholder
    d["match_status"] = "matched" if dhis2_adm > 0 else "unmatched"
    d["is_imam"] = True
    d["is_dhis2_only"] = False

    facilities.append(d)

print(f"  IMAM facilities: {len(facilities)} ({sum(1 for f in facilities if f['state']=='Kaduna')} Kaduna, {sum(1 for f in facilities if f['state']=='Kano')} Kano)")


# ============================================================
# 2. Load DHIS2 facility-level data
# ============================================================
print("Processing DHIS2 facility data...")
dhis2_facilities = []
with open(DATA_DIR / "DHIS2_SAM_Facilities_Sep2024_Aug2026.csv", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    for r in reader:
        dhis2_facilities.append({
            "state": r["state"],
            "lga": clean_lga(r["lga"]),
            "ward": clean_lga(r["ward"]),
            "facility": clean_facility(r["facility"]),
            "sam_admitted": safe_int(r["sam_admitted"]),
            "sam_treated": safe_int(r["sam_treated"]),
            "months_reporting": safe_int(r["months_reporting"]),
            "first_month": r.get("first_month", ""),
            "last_month": r.get("last_month", ""),
        })

# Separate Kaduna DHIS2-only facilities
dhis2_only_kaduna = []
with open(DATA_DIR / "DHIS2_Only_Facilities_Not_In_IMAM_Kaduna.csv", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    for r in reader:
        dhis2_only_kaduna.append({
            "state": "Kaduna",
            "lga": clean_lga(r["lga"]),
            "ward": clean_lga(r.get("ward", "")),
            "facility": clean_facility(r["facility"]),
            "sam_admitted": safe_int(r["sam_admitted"]),
            "sam_treated": safe_int(r["sam_treated"]),
            "months_reporting": safe_int(r["months"]),
            "match_status": "dhis2_only",
            "is_imam": False,
            "is_dhis2_only": True,
        })

print(f"  DHIS2 facilities total: {len(dhis2_facilities)} (227 Kaduna, 230 Kano)")
print(f"  DHIS2-only Kaduna: {len(dhis2_only_kaduna)}")

# Identify Kano DHIS2-only facilities (those in DHIS2 but not in IMAM frame)
kano_imam_facs = set()
for f in facilities:
    if f["state"] == "Kano":
        kano_imam_facs.add(clean_facility(f["facility_name"]).upper())

kano_dhis2 = [d for d in dhis2_facilities if d["state"] == "Kano"]
dhis2_only_kano = []
for d in kano_dhis2:
    fname = d["facility"].upper()
    if fname not in kano_imam_facs:
        dhis2_only_kano.append({
            "state": "Kano",
            "lga": d["lga"],
            "ward": d["ward"],
            "facility": d["facility"],
            "sam_admitted": d["sam_admitted"],
            "sam_treated": d["sam_treated"],
            "months_reporting": d["months_reporting"],
            "match_status": "dhis2_only",
            "is_imam": False,
            "is_dhis2_only": True,
        })

print(f"  DHIS2-only Kano (approx): {len(dhis2_only_kano)}")

all_dhis2_only = dhis2_only_kaduna + dhis2_only_kano


# ============================================================
# 3. Merge DHIS2 data into facility records where missing
# ============================================================
print("Merging DHIS2 aggregated data into IMAM facilities...")

# Build DHIS2 lookup by (state, facility_upper)
dhis2_lookup = {}
for d in dhis2_facilities:
    key = (d["state"], d["facility"].upper())
    dhis2_lookup[key] = d

# For Kaduna IMAM facilities that have 0 dhis2 in sampling frame, try DHIS2 CSV
kaduna_matched_from_csv = 0
for f in facilities:
    if f["state"] == "Kaduna" and f["dhis2_sam_admitted"] == 0:
        # Try to find in DHIS2 by approximate name match
        for dkey, dval in dhis2_lookup.items():
            if dkey[0] == "Kaduna":
                imam_upper = f["facility_name"].upper()
                dhis2_upper = dval["facility"].upper()
                if imam_upper in dhis2_upper or dhis2_upper in imam_upper:
                    f["dhis2_sam_admitted"] = dval["sam_admitted"] or 0
                    f["dhis2_sam_treated"] = dval["sam_treated"] or 0
                    f["match_status"] = "matched"
                    f["imam_dhis2_diff"] = f["imam_admissions"] - f["dhis2_sam_admitted"]
                    if f["imam_admissions"] > 0:
                        f["imam_dhis2_gap_pct"] = round((f["imam_admissions"] - f["dhis2_sam_admitted"]) / f["imam_admissions"] * 100, 1)
                    kaduna_matched_from_csv += 1
                    break

print(f"  Additional Kaduna DHIS2 matches from CSV: {kaduna_matched_from_csv}")


# ============================================================
# 4. Load corrected Kaduna facility matches
# ============================================================
print("Loading 16 corrected Kaduna matches...")
wb = openpyxl.load_workbook(DATA_DIR / "Updated Kaduna_IMAM_No_DHIS2_Match_Final.xlsx", read_only=True, data_only=True)
ws = wb["Sheet1"]
corrected_matches = []
for row in ws.iter_rows(min_row=2, values_only=True):
    if row[0] is None:
        continue
    corrected_matches.append({
        "lga": str(row[0]),
        "correct_name": str(row[1]) if row[1] else "",
        "imam_name": str(row[2]) if row[2] else "",
        "has_dhis2": str(row[3]) if row[3] else "",
        "sam_admissions": safe_int(row[5]),
    })
wb.close()
print(f"  Corrected matches: {len(corrected_matches)}")


# ============================================================
# 5. Load LGA reconciliation data for Kaduna
# ============================================================
print("Loading Kaduna LGA reconciliation...")
lga_recon_kaduna = []
with open(DATA_DIR / "Kaduna_Q1_LGA_Reconciliation.csv", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    for r in reader:
        lga_recon_kaduna.append({
            "state": "Kaduna",
            "lga": r["lga"],
            "lga_normalized": normalize_lga(r["lga"]),
            "fac_total": safe_int(r["fac_total"]),
            "imam_admissions": safe_int(r.get("imam_admissions")),
            "imam_cured": safe_int(r.get("imam_cured")),
            "imam_defaults": safe_int(r.get("imam_defaults")),
            "imam_deaths": safe_int(r.get("imam_deaths")),
            "dhis2_admitted": safe_int(r.get("dhis2_admitted")),
            "rutf_received": safe_int(r.get("rutf_received")),
            "rutf_utilized": safe_int(r.get("rutf_utilized")),
            "fac_with_dhis2": safe_int(r.get("fac_with_dhis2")),
            "fac_no_dhis2": safe_int(r.get("fac_no_dhis2")),
            "imam_dhis2_gap": safe_float(r.get("imam_dhis2_gap")),
            "gap_pct": safe_float(r.get("gap_pct")),
            "cure_rate": safe_float(r.get("cure_rate")),
            "default_rate": safe_float(r.get("default_rate")),
        })
print(f"  Kaduna LGA records: {len(lga_recon_kaduna)}")


# ============================================================
# 6. Compute LGA-level aggregations from facility data (both states)
# ============================================================
print("Computing LGA-level aggregations...")

def aggregate_lga(facs, state_filter=None):
    lga_data = defaultdict(lambda: {
        "state": "", "lga": "", "lga_normalized": "",
        "imam_facilities": 0, "imam_admissions": 0,
        "sam_cured": 0, "sam_defaulters": 0, "sam_death": 0,
        "sam_non_recovered": 0, "sam_transfer_out": 0,
        "dhis2_sam_admitted": 0, "dhis2_sam_treated": 0,
        "rutf_received": 0, "rutf_utilized": 0, "lmd_rutf": 0,
        "matched_facilities": 0, "unmatched_facilities": 0,
    })
    for f in facs:
        if state_filter and f["state"] != state_filter:
            continue
        key = (f["state"], normalize_lga(f["lga"]))
        d = lga_data[key]
        d["state"] = f["state"]
        d["lga"] = f["lga"]
        d["lga_normalized"] = normalize_lga(f["lga"])
        d["imam_facilities"] += 1
        d["imam_admissions"] += f["imam_admissions"]
        d["sam_cured"] += f["sam_cured"]
        d["sam_defaulters"] += f["sam_defaulters"]
        d["sam_death"] += f["sam_death"]
        d["sam_non_recovered"] += f.get("sam_non_recovered", 0)
        d["sam_transfer_out"] += f.get("sam_transfer_out", 0)
        d["dhis2_sam_admitted"] += f["dhis2_sam_admitted"]
        d["dhis2_sam_treated"] += f["dhis2_sam_treated"]
        d["rutf_received"] += f["rutf_received_sachets"]
        d["rutf_utilized"] += f["rutf_utilized_sachets"]
        d["lmd_rutf"] += f.get("lmd_rutf_sachets", 0)
        if f["match_status"] == "matched":
            d["matched_facilities"] += 1
        else:
            d["unmatched_facilities"] += 1

    result = []
    for key, d in lga_data.items():
        total_exits = d["sam_cured"] + d["sam_defaulters"] + d["sam_death"] + d["sam_non_recovered"] + d["sam_transfer_out"]
        if total_exits > 0:
            d["cure_rate"] = round(d["sam_cured"] / total_exits * 100, 1)
            d["default_rate"] = round(d["sam_defaulters"] / total_exits * 100, 1)
            d["death_rate"] = round(d["sam_death"] / total_exits * 100, 1)
        else:
            d["cure_rate"] = None
            d["default_rate"] = None
            d["death_rate"] = None

        d["imam_dhis2_diff"] = d["imam_admissions"] - d["dhis2_sam_admitted"] if d["dhis2_sam_admitted"] > 0 else None
        if d["imam_admissions"] > 0 and d["dhis2_sam_admitted"] > 0:
            d["imam_dhis2_gap_pct"] = round((d["imam_admissions"] - d["dhis2_sam_admitted"]) / d["imam_admissions"] * 100, 1)
        else:
            d["imam_dhis2_gap_pct"] = None

        d["rutf_implied"] = d["imam_admissions"] * RUTF_SACHETS_PER_CHILD
        result.append(d)

    return sorted(result, key=lambda x: x["imam_admissions"], reverse=True)

lga_all = aggregate_lga(facilities)

# Also count DHIS2-only facilities per LGA
dhis2_only_by_lga = defaultdict(lambda: {"count": 0, "sam_admitted": 0})
for d in all_dhis2_only:
    lga_norm = normalize_lga(d["lga"])
    st = d["state"]
    key = (st, lga_norm)
    dhis2_only_by_lga[key]["count"] += 1
    dhis2_only_by_lga[key]["sam_admitted"] += d["sam_admitted"] or 0

for lga in lga_all:
    key = (lga["state"], lga["lga_normalized"])
    if key in dhis2_only_by_lga:
        lga["dhis2_only_facilities"] = dhis2_only_by_lga[key]["count"]
        lga["dhis2_only_admissions"] = dhis2_only_by_lga[key]["sam_admitted"]
    else:
        lga["dhis2_only_facilities"] = 0
        lga["dhis2_only_admissions"] = 0

print(f"  LGA aggregations: {len(lga_all)}")


# ============================================================
# 7. Compute state-level summaries
# ============================================================
print("Computing state summaries...")

def state_summary(state, facs, dhis2_only_list):
    state_facs = [f for f in facs if f["state"] == state]
    d2only = [d for d in dhis2_only_list if d["state"] == state]

    imam_adm = sum(f["imam_admissions"] for f in state_facs)
    dhis2_adm = sum(f["dhis2_sam_admitted"] for f in state_facs)
    cured = sum(f["sam_cured"] for f in state_facs)
    defaults = sum(f["sam_defaulters"] for f in state_facs)
    deaths = sum(f["sam_death"] for f in state_facs)
    non_rec = sum(f.get("sam_non_recovered", 0) for f in state_facs)
    trans_out = sum(f.get("sam_transfer_out", 0) for f in state_facs)

    total_exits = cured + defaults + deaths + non_rec + trans_out

    matched = sum(1 for f in state_facs if f["match_status"] == "matched")
    unmatched = sum(1 for f in state_facs if f["match_status"] != "matched")

    lgas = set(f["lga_normalized"] for f in state_facs)

    rutf_received = sum(f["rutf_received_sachets"] for f in state_facs)
    rutf_utilized = sum(f["rutf_utilized_sachets"] for f in state_facs)
    lmd_rutf = sum(f.get("lmd_rutf_sachets", 0) for f in state_facs)

    return {
        "state": state,
        "imam_facilities": len(state_facs),
        "lgas": len(lgas),
        "imam_admissions": imam_adm,
        "dhis2_admissions_matched": dhis2_adm,
        "imam_dhis2_diff": imam_adm - dhis2_adm if dhis2_adm > 0 else None,
        "imam_dhis2_gap_pct": round((imam_adm - dhis2_adm) / imam_adm * 100, 1) if imam_adm > 0 and dhis2_adm > 0 else None,
        "matched_facilities": matched,
        "unmatched_facilities": unmatched,
        "dhis2_only_facilities": len(d2only),
        "dhis2_only_admissions": sum(d["sam_admitted"] or 0 for d in d2only),
        "sam_cured": cured,
        "sam_defaulters": defaults,
        "sam_deaths": deaths,
        "cure_rate": round(cured / total_exits * 100, 1) if total_exits > 0 else None,
        "default_rate": round(defaults / total_exits * 100, 1) if total_exits > 0 else None,
        "death_rate": round(deaths / total_exits * 100, 1) if total_exits > 0 else None,
        "rutf_received_sachets": rutf_received,
        "rutf_utilized_sachets": rutf_utilized,
        "lmd_rutf_sachets": lmd_rutf,
        "rutf_implied_sachets": imam_adm * RUTF_SACHETS_PER_CHILD,
    }

kaduna_summary = state_summary("Kaduna", facilities, all_dhis2_only)
kano_summary = state_summary("Kano", facilities, all_dhis2_only)

# Combined
combined = {
    "state": "Combined",
    "imam_facilities": kaduna_summary["imam_facilities"] + kano_summary["imam_facilities"],
    "lgas": kaduna_summary["lgas"] + kano_summary["lgas"],
    "imam_admissions": kaduna_summary["imam_admissions"] + kano_summary["imam_admissions"],
    "dhis2_admissions_matched": (kaduna_summary["dhis2_admissions_matched"] or 0) + (kano_summary["dhis2_admissions_matched"] or 0),
    "dhis2_only_facilities": kaduna_summary["dhis2_only_facilities"] + kano_summary["dhis2_only_facilities"],
    "dhis2_only_admissions": kaduna_summary["dhis2_only_admissions"] + kano_summary["dhis2_only_admissions"],
    "sam_cured": kaduna_summary["sam_cured"] + kano_summary["sam_cured"],
    "sam_defaulters": kaduna_summary["sam_defaulters"] + kano_summary["sam_defaulters"],
    "sam_deaths": kaduna_summary["sam_deaths"] + kano_summary["sam_deaths"],
    "matched_facilities": kaduna_summary["matched_facilities"] + kano_summary["matched_facilities"],
    "unmatched_facilities": kaduna_summary["unmatched_facilities"] + kano_summary["unmatched_facilities"],
    "rutf_received_sachets": kaduna_summary["rutf_received_sachets"] + kano_summary["rutf_received_sachets"],
    "rutf_utilized_sachets": kaduna_summary["rutf_utilized_sachets"] + kano_summary["rutf_utilized_sachets"],
    "lmd_rutf_sachets": kaduna_summary["lmd_rutf_sachets"] + kano_summary["lmd_rutf_sachets"],
    "rutf_implied_sachets": kaduna_summary["rutf_implied_sachets"] + kano_summary["rutf_implied_sachets"],
}
total_exits = combined["sam_cured"] + combined["sam_defaulters"] + combined["sam_deaths"]
if total_exits > 0:
    combined["cure_rate"] = round(combined["sam_cured"] / total_exits * 100, 1)
    combined["default_rate"] = round(combined["sam_defaulters"] / total_exits * 100, 1)
    combined["death_rate"] = round(combined["sam_deaths"] / total_exits * 100, 1)
else:
    combined["cure_rate"] = combined["default_rate"] = combined["death_rate"] = None

imam_total = combined["imam_admissions"]
dhis2_total = combined["dhis2_admissions_matched"]
if imam_total > 0 and dhis2_total > 0:
    combined["imam_dhis2_diff"] = imam_total - dhis2_total
    combined["imam_dhis2_gap_pct"] = round((imam_total - dhis2_total) / imam_total * 100, 1)
else:
    combined["imam_dhis2_diff"] = None
    combined["imam_dhis2_gap_pct"] = None

state_summaries = [combined, kaduna_summary, kano_summary]

for s in state_summaries:
    print(f"  {s['state']}: {s['imam_facilities']} IMAM facs, {s['imam_admissions']} adm, DHIS2 matched: {s['dhis2_admissions_matched']}")


# ============================================================
# 8. Load Kano RUTF Cumulative data
# ============================================================
print("Loading Kano RUTF cumulative data...")
wb = openpyxl.load_workbook(DATA_DIR / "Kano_State_data" / "RUTF Cumulative data.xlsx", read_only=True, data_only=True)
ws = wb["Sheet1"]
kano_rutf = []
for row in ws.iter_rows(min_row=2, values_only=True):
    if row[3] is None:
        continue
    kano_rutf.append({
        "year": safe_int(row[0]),
        "month": str(row[1]) if row[1] else "",
        "state": str(row[3]),
        "lga": str(row[4]),
        "ward": str(row[5]),
        "children_admitted": safe_int(row[6]),
        "children_discharged": safe_int(row[7]),
        "children_cured": safe_int(row[8]),
        "rutf_balance_pieces": safe_int(row[9]),
        "children_defaulters": safe_int(row[10]),
        "rutf_balance_cartons": safe_int(row[11]),
        "children_deaths": safe_int(row[12]),
    })
wb.close()
print(f"  Kano RUTF records: {len(kano_rutf)}")


# ============================================================
# 9. Build opportunity classification
# ============================================================
print("Building opportunity classification...")

for f in facilities:
    cure = f.get("cure_rate")
    default = f.get("default_rate")
    gap_pct = f.get("imam_dhis2_gap_pct")

    if cure is None:
        f["opportunity_class"] = "Insufficient Data"
        continue

    has_gap_concern = gap_pct is not None and abs(gap_pct) > 30
    has_quality_concern = (cure < 75) or (default is not None and default > 15)

    if not has_gap_concern and not has_quality_concern:
        f["opportunity_class"] = "Functioning"
    elif has_quality_concern and not has_gap_concern:
        f["opportunity_class"] = "Quality Concern"
    elif has_gap_concern and not has_quality_concern:
        f["opportunity_class"] = "Needs Reconciliation"
    else:
        f["opportunity_class"] = "Moderate"


# ============================================================
# 10. Build sampling intelligence
# ============================================================
print("Building sampling intelligence...")

# For Kaduna: top 30 positive gap, top 30 negative gap
kaduna_facs = [f for f in facilities if f["state"] == "Kaduna" and f["imam_dhis2_diff"] is not None]
kaduna_facs_sorted = sorted(kaduna_facs, key=lambda x: x["imam_dhis2_diff"], reverse=True)

for f in facilities:
    f["sampling_status"] = "not_selected"
    f["sampling_stratum"] = None

# Top 30 positive gap
for i, f in enumerate(kaduna_facs_sorted[:30]):
    f["sampling_status"] = "certainty"
    f["sampling_stratum"] = "positive_gap_top30"

# Top 30 negative gap
kaduna_facs_neg = sorted(kaduna_facs, key=lambda x: x["imam_dhis2_diff"])
for i, f in enumerate(kaduna_facs_neg[:30]):
    if f["sampling_status"] != "certainty":  # avoid double-counting
        f["sampling_status"] = "certainty"
        f["sampling_stratum"] = "negative_gap_top30"

# Count unique certainty selections
certainty_count = sum(1 for f in facilities if f["sampling_status"] == "certainty")
print(f"  Certainty stratum (Kaduna): {certainty_count} facilities")


# ============================================================
# 11. Monthly trends
# ============================================================
print("Building monthly trends...")
monthly_trends = defaultdict(lambda: {
    "sam_admissions": 0, "sam_cured": 0, "sam_defaulters": 0, "sam_death": 0,
    "rutf_utilized": 0, "rutf_received": 0
})

for r in imam_rows:
    state = str(r.get("state", ""))
    yr = r.get("year")
    mn = r.get("month_num")
    if not yr or not mn:
        continue
    period = f"{int(yr)}-{int(mn):02d}"
    key = (state, period)
    monthly_trends[key]["sam_admissions"] += safe_int(r.get("sam_new_admission")) or 0
    monthly_trends[key]["sam_cured"] += safe_int(r.get("sam_cured")) or 0
    monthly_trends[key]["sam_defaulters"] += safe_int(r.get("sam_defaulters")) or 0
    monthly_trends[key]["sam_death"] += safe_int(r.get("sam_death")) or 0
    monthly_trends[key]["rutf_utilized"] += safe_int(r.get("rutf_utilized_sachets")) or 0
    monthly_trends[key]["rutf_received"] += safe_int(r.get("rutf_received_sachets")) or 0

trends_list = []
for (state, period), vals in sorted(monthly_trends.items()):
    trends_list.append({"state": state, "period": period, **vals})

print(f"  Monthly trend records: {len(trends_list)}")


# ============================================================
# 12. Convert shapefile to GeoJSON
# ============================================================
print("Converting shapefile to GeoJSON...")
try:
    import shapefile
    sf = shapefile.Reader(str(DATA_DIR / "kano_kaduna_lga_boundary" / "kano_kaduna_lga"))
    fields = [f[0] for f in sf.fields[1:]]
    print(f"  Shapefile fields: {fields}")

    features = []
    for sr in sf.shapeRecords():
        props = dict(zip(fields, sr.record))
        # Clean properties
        clean_props = {}
        for k, v in props.items():
            if isinstance(v, bytes):
                v = v.decode("utf-8", errors="replace")
            clean_props[k] = v

        geom = sr.shape.__geo_interface__
        features.append({
            "type": "Feature",
            "properties": clean_props,
            "geometry": geom,
        })

    geojson = {
        "type": "FeatureCollection",
        "features": features,
    }

    with open(GEO_DIR / "kano_kaduna_lga.geojson", "w") as f:
        json.dump(geojson, f)

    print(f"  GeoJSON features: {len(features)}")
    # Print sample properties
    if features:
        print(f"  Sample props: {features[0]['properties']}")
except Exception as e:
    print(f"  Shapefile conversion error: {e}")
    print("  Will need to provide GeoJSON separately")


# ============================================================
# 13. Write output files
# ============================================================
print("\nWriting output files...")

# Remove set objects that aren't JSON serializable
for f in facilities:
    for k, v in list(f.items()):
        if isinstance(v, set):
            f[k] = list(v)

with open(OUT_DIR / "facilities.json", "w") as f:
    json.dump(facilities, f, indent=None, default=str)
print(f"  facilities.json: {len(facilities)} records")

with open(OUT_DIR / "dhis2_only.json", "w") as f:
    json.dump(all_dhis2_only, f, indent=None, default=str)
print(f"  dhis2_only.json: {len(all_dhis2_only)} records")

with open(OUT_DIR / "lga_summary.json", "w") as f:
    json.dump(lga_all, f, indent=None, default=str)
print(f"  lga_summary.json: {len(lga_all)} records")

with open(OUT_DIR / "state_summary.json", "w") as f:
    json.dump(state_summaries, f, indent=2, default=str)
print(f"  state_summary.json: {len(state_summaries)} records")

with open(OUT_DIR / "monthly_trends.json", "w") as f:
    json.dump(trends_list, f, indent=None, default=str)
print(f"  monthly_trends.json: {len(trends_list)} records")

with open(OUT_DIR / "corrected_matches.json", "w") as f:
    json.dump(corrected_matches, f, indent=2, default=str)
print(f"  corrected_matches.json: {len(corrected_matches)} records")

with open(OUT_DIR / "kano_rutf.json", "w") as f:
    json.dump(kano_rutf, f, indent=None, default=str)
print(f"  kano_rutf.json: {len(kano_rutf)} records")

# DHIS2 facilities for cross-reference
with open(OUT_DIR / "dhis2_facilities.json", "w") as f:
    json.dump(dhis2_facilities, f, indent=None, default=str)
print(f"  dhis2_facilities.json: {len(dhis2_facilities)} records")

# Kaduna LGA recon (pre-computed from CSV)
with open(OUT_DIR / "kaduna_lga_recon.json", "w") as f:
    json.dump(lga_recon_kaduna, f, indent=None, default=str)
print(f"  kaduna_lga_recon.json: {len(lga_recon_kaduna)} records")


# ============================================================
# 14. Validation summary
# ============================================================
print("\n=== VALIDATION ===")
kd = kaduna_summary
print(f"Kaduna IMAM facilities: {kd['imam_facilities']} (expected ~166, got {kd['imam_facilities']})")
print(f"Kaduna IMAM admissions: {kd['imam_admissions']:,} (expected ~108,213)")
print(f"Kaduna DHIS2 matched: {kd['dhis2_admissions_matched']:,} (expected ~91,246)")
print(f"Kaduna IMAM-DHIS2 diff: {kd.get('imam_dhis2_diff', 'N/A')} (expected ~16,967)")
print(f"Kaduna gap %: {kd.get('imam_dhis2_gap_pct', 'N/A')}% (expected ~15.7%)")
print(f"Kaduna LGAs: {kd['lgas']} (expected 23)")
print(f"Kaduna DHIS2-only: {kd['dhis2_only_facilities']} (expected 103)")
print(f"Kaduna DHIS2-only admissions: {kd['dhis2_only_admissions']:,} (expected ~33,591)")

kn = kano_summary
print(f"\nKano IMAM facilities: {kn['imam_facilities']}")
print(f"Kano LGAs: {kn['lgas']}")
print(f"Kano IMAM admissions: {kn['imam_admissions']:,}")
print(f"Kano DHIS2 matched: {kn['dhis2_admissions_matched']:,}")

print("\n=== DONE ===")
