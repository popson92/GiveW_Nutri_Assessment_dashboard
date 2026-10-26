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

# Apply corrected matches: fuzzy-match corrected names against DHIS2 facilities
from difflib import SequenceMatcher

# Manual overrides for cases where fuzzy matching can't bridge abbreviated names
MANUAL_DHIS2_OVERRIDES = {
    ("BIRNIN GWARI", "B/GWARI"): "Maternal And Child Health Clinic Birnin Gwari",
    ("BIRNIN GWARI", "PHC ANG. HALIDU"): "Anguwan Haladu Priamry Health Centre",
    ("IGABI", "PHC MIYYATI"): "Rigasa (Miyatti Allah) Primary Health Centre",
    ("JEMA'A", "JANGINDI"): "Jagindi Gari Health Centre",
    ("KADUNA SOUTH", "PHC K/GWARI"): "Kurmin Gwari  Primary Health Center",
    ("KAURU", "D/DAU"): "Dandaura Primary Health Center",
    ("CHIKUN", "Nasarawa"): "Nassarawa Primary Health Centre (Chikun)",
}

# Overrides for the remaining 21 unmatched Kaduna IMAM facilities
ADDITIONAL_OVERRIDES = {
    ("IGABI", "PHC JAJI"): "Jaji Comprehensive Health Centre",
    ("JEMA'A", "PHC KAGOMA"): "Kagoma Primary Health Centre",
    ("JABA", "PHC  Kwoi"): None,  # No clear DHIS2 match in Jaba
    ("JABA", "PHC Ankung"): "Ankung ?A? Primary Health Centre",
    ("JABA", "PHC CHORI"): None,  # No clear DHIS2 match
    ("JABA", "PHC Samban"): None,  # No clear DHIS2 match
    ("KADUNA NORTH", "PHC KABALA"): "Primary Health Care Centre Kabala",
    ("KACHIA", "KATARI PHC"): "Katari Primary Health Clinic",
    ("KAGARKO", "PHC KUKUI"): None,  # Best match "Kenyi" is not the same facility
    ("KAURA", "PHC Agban"): "Maraban Agban Primary Health Centre",
    ("KAURA", "PHC MALLAGUM"): "Mallagum 2 Maternal And Child Health Clinic",
    ("KAURA", "PHC MANCHOK"): "Manchok Primary  Health Clinic",
    ("KAURU", "B/KOGI"): "Bakin Kogi Primary Health Center",
    ("KUBAU", "PHC HASKIYA"): None,  # No clear DHIS2 match in Kubau
    ("LERE", "MPHC A/HAYATU"): None,  # Same facility as below, different name
    ("LERE", "PHC ANG HAYATU"): None,  # No DHIS2 match (0 adm candidates)
    ("SABON GARI", "PHC ABDU KWARI"): None,  # No clear match
    ("SABON GARI", "PHC HANWA"): None,  # No clear match
    ("SOBA", "PHC DANWATA"): None,  # No clear match
    ("ZARIA", "KUGU"): None,  # No clear match
    ("ZARIA", "PHC T/WADA"): None,  # T/Wada is Tudun Wada, no direct match
}
MANUAL_DHIS2_OVERRIDES.update({k: v for k, v in ADDITIONAL_OVERRIDES.items() if v is not None})

corrected_applied = 0
for cm in corrected_matches:
    imam_lga = normalize_lga(cm["lga"])
    correct_name = cm["correct_name"].upper()
    imam_name_upper = cm["imam_name"].upper()

    # Find the IMAM facility in our list
    target_fac = None
    for f in facilities:
        if f["state"] == "Kaduna" and normalize_lga(f["lga"]) == imam_lga:
            if f["facility_name"].upper() == imam_name_upper or f["facility_name"].upper() in imam_name_upper or imam_name_upper in f["facility_name"].upper():
                target_fac = f
                break
    if not target_fac:
        # Broader search by LGA
        for f in facilities:
            if f["state"] == "Kaduna" and normalize_lga(f["lga"]) == imam_lga:
                ratio = SequenceMatcher(None, f["facility_name"].upper(), imam_name_upper).ratio()
                if ratio > 0.6:
                    target_fac = f
                    break

    if not target_fac:
        print(f"  WARNING: Could not find IMAM facility '{cm['imam_name']}' in {cm['lga']}")
        continue

    if target_fac["dhis2_sam_admitted"] > 0:
        continue  # Already matched

    # Check manual overrides first
    override_key = (imam_lga, cm["imam_name"])
    override_name = MANUAL_DHIS2_OVERRIDES.get(override_key)

    best_score = 0
    best_dhis2 = None

    if override_name:
        for d in dhis2_facilities:
            if d["state"] == "Kaduna" and d["facility"] == override_name:
                best_dhis2 = d
                best_score = 1.0
                break

    if not best_dhis2:
        # Find best DHIS2 match using corrected name
        for d in dhis2_facilities:
            if d["state"] != "Kaduna":
                continue
            dhis2_lga = normalize_lga(d["lga"])
            if dhis2_lga != imam_lga:
                continue
            dhis2_clean = d["facility"].upper()
            score = SequenceMatcher(None, correct_name, dhis2_clean).ratio()
            if score > best_score:
                best_score = score
                best_dhis2 = d

    if best_dhis2 and best_score > 0.35:
        target_fac["dhis2_sam_admitted"] = best_dhis2["sam_admitted"] or 0
        target_fac["dhis2_sam_treated"] = best_dhis2["sam_treated"] or 0
        target_fac["match_status"] = "matched"
        if target_fac["dhis2_sam_admitted"] > 0:
            target_fac["imam_dhis2_diff"] = target_fac["imam_admissions"] - target_fac["dhis2_sam_admitted"]
            if target_fac["imam_admissions"] > 0:
                target_fac["imam_dhis2_gap_pct"] = round(
                    (target_fac["imam_admissions"] - target_fac["dhis2_sam_admitted"]) / target_fac["imam_admissions"] * 100, 1
                )
        corrected_applied += 1
        print(f"  MATCHED: '{cm['imam_name']}' -> '{best_dhis2['facility']}' (score={best_score:.2f}, DHIS2 adm={best_dhis2['sam_admitted']})")
    else:
        print(f"  NO MATCH: '{cm['imam_name']}' corrected='{cm['correct_name']}' best_score={best_score:.2f}")

print(f"  Corrected matches applied: {corrected_applied} of {len(corrected_matches)}")

# Second pass: match remaining unmatched Kaduna facilities using overrides
print("Applying additional Kaduna DHIS2 matches...")
additional_matched = 0
for f in facilities:
    if f["state"] != "Kaduna" or f["match_status"] == "matched":
        continue
    lga = normalize_lga(f["lga"])
    override_key = (lga, f["facility_name"])
    override_name = MANUAL_DHIS2_OVERRIDES.get(override_key) or ADDITIONAL_OVERRIDES.get(override_key)
    if not override_name:
        continue
    for d in dhis2_facilities:
        if d["state"] == "Kaduna" and d["facility"] == override_name:
            f["dhis2_sam_admitted"] = d["sam_admitted"] or 0
            f["dhis2_sam_treated"] = d["sam_treated"] or 0
            f["match_status"] = "matched"
            if f["dhis2_sam_admitted"] > 0:
                f["imam_dhis2_diff"] = f["imam_admissions"] - f["dhis2_sam_admitted"]
                if f["imam_admissions"] > 0:
                    f["imam_dhis2_gap_pct"] = round(
                        (f["imam_admissions"] - f["dhis2_sam_admitted"]) / f["imam_admissions"] * 100, 1
                    )
            additional_matched += 1
            print(f"  MATCHED: '{f['facility_name']}' -> '{d['facility']}' (adm={d['sam_admitted']})")
            break

print(f"  Additional matches applied: {additional_matched}")

# Final count
kaduna_remaining = sum(1 for f in facilities if f["state"] == "Kaduna" and f["match_status"] != "matched")
print(f"  Kaduna still unmatched: {kaduna_remaining}")


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
    "rutf_utilized": 0, "rutf_received": 0, "lmd_rutf": 0
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

# Add monthly LMD data
try:
    import pandas as pd
    lmd_monthly = pd.read_excel(DATA_DIR / "LMD_RUTF_2025_Assembled.xlsx")
    for _, row in lmd_monthly.iterrows():
        yr = int(row["year"])
        mn = int(row["month"])
        period = f"{yr}-{mn:02d}"
        sachets = int(row.get("lmd_rutf_sachets", 0) or 0)
        key = ("Kaduna", period)
        monthly_trends[key]["lmd_rutf"] += sachets
    lmd_months_with_data = set()
    for (state, period), vals in monthly_trends.items():
        if state == "Kaduna" and vals["lmd_rutf"] > 0:
            lmd_months_with_data.add(period)
    print(f"  LMD monthly data added: {len(lmd_months_with_data)} months with data")
except Exception as e:
    print(f"  LMD monthly integration error: {e}")

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
# 13. Integrate Kano primary data + MSF data
# ============================================================
print("Integrating Kano primary data + MSF data...")
try:
    import pandas as pd

    # Kano State Nutrition Primary Data
    kano_primary = pd.read_excel(
        DATA_DIR / "Kano_State_data" / "Kano State Nutrition Primary Data.xlsx",
        sheet_name="Data Input Sheet", skiprows=2
    )
    kano_primary_facs = kano_primary.groupby(["LGA", "Health Facility Name"]).agg(
        new_admission=("New Admission", "sum"),
        cured=("Cured", "sum"),
        defaulters=("Defaulters", "sum"),
        death=("Death", "sum"),
        non_recovered=("Non-Recovered ", "sum"),
        transfer_in=("Transfer IN", "sum"),
        transfer_out=("Transfer OUT", "sum"),
        implementing_partner=("Implementing partner", "first"),
        imam_type=("IMAM Type", "first"),
        months=("Month", "nunique"),
    ).reset_index()
    kano_primary_active = kano_primary_facs[kano_primary_facs.new_admission > 0]
    print(f"  Kano primary: {len(kano_primary_active)} facilities with admissions, {int(kano_primary_active.new_admission.sum())} total")

    # MSF data
    msf_df = pd.read_excel(DATA_DIR / "Kano_State_data" / "Msf data.ods", engine="odf", sheet_name="Sheet2", skiprows=1)
    msf_df = msf_df[msf_df["State"].notna() & (msf_df["State"] != "")]
    msf_facs = msf_df.groupby(["LGA", "Health Facility Name"]).agg(
        new_admission=("New Admission", "sum"),
        cured=("Cured", "sum"),
        defaulters=("Defaulters", "sum"),
        death=("Death", "sum"),
    ).reset_index()
    print(f"  MSF: {len(msf_facs)} facilities, {int(msf_facs.new_admission.sum())} admissions")

    # Update Kano IMAM facilities with primary data where available
    kano_updated = 0
    for _, prow in kano_primary_active.iterrows():
        fac_name = str(prow["Health Facility Name"]).strip()
        lga_name = str(prow["LGA"]).strip()
        for f in facilities:
            if f["state"] != "Kano":
                continue
            if (f["facility_name"].upper() == fac_name.upper() or
                fac_name.upper() in f["facility_name"].upper() or
                f["facility_name"].upper() in fac_name.upper()):
                if f.get("kano_primary_admissions") is None:
                    f["kano_primary_admissions"] = int(prow["new_admission"])
                    f["kano_primary_cured"] = int(prow["cured"])
                    f["kano_primary_partner"] = str(prow["implementing_partner"])
                    kano_updated += 1
                break
    print(f"  Kano IMAM facilities updated with primary data: {kano_updated}")

    # Add MSF admissions as supplementary field
    msf_updated = 0
    for _, mrow in msf_facs.iterrows():
        fac_name = str(mrow["Health Facility Name"]).strip()
        for f in facilities:
            if f["state"] != "Kano":
                continue
            if fac_name.upper() in f["facility_name"].upper() or f["facility_name"].upper() in fac_name.upper():
                f["msf_admissions"] = int(mrow["new_admission"])
                f["msf_cured"] = int(mrow["cured"])
                msf_updated += 1
                break
        else:
            # MSF facility not found in IMAM frame, note it
            print(f"  MSF facility not in IMAM: {fac_name} ({mrow['LGA']})")
    print(f"  MSF-linked IMAM facilities: {msf_updated}")

except Exception as e:
    print(f"  Kano integration error: {e}")
    import traceback; traceback.print_exc()

# ============================================================
# 13b. Build facility profile (Venn diagram data)
# ============================================================
print("Building facility profile for Venn diagram...")

# --- Kano: use 97 CMAM facilities list as the IMAM source ---
try:
    kano_cmam = pd.read_excel(
        DATA_DIR / "Kano_State_data" / "Kano State Nutrition Primary Data.xlsx",
        sheet_name="Kano CMAM Facilities List"
    )
    kano_cmam["LGA"] = kano_cmam["LGA"].ffill()
    kano_cmam = kano_cmam[kano_cmam["Health Facility Name"].notna()]
    print(f"  Kano CMAM list: {len(kano_cmam)} facilities across {kano_cmam['LGA'].nunique()} LGAs")

    # Get Kano DHIS2 facilities (those with at least 1 admission or treatment)
    kano_dhis2_all = [d for d in dhis2_facilities if d.get("state") == "Kano" and (d.get("sam_admitted", 0) or 0) + (d.get("sam_treated", 0) or 0) > 0]
    kano_dhis2_names = {d["facility"].upper().strip() for d in kano_dhis2_all}
    print(f"  Kano DHIS2 with admissions/treatment: {len(kano_dhis2_all)} facilities")

    # Match CMAM list against DHIS2
    import re
    from difflib import SequenceMatcher

    def normalize_fac_name(name):
        """Strip prefixes/suffixes to get core place name for matching."""
        n = name.upper().strip()
        # Remove 'kn ' / 'kd ' prefix from DHIS2 names
        n = re.sub(r'^(KN|KD)\s+', '', n)
        # Remove common suffixes
        for sfx in ['PRIMARY HEALTH CENTRE', 'PRIMARY HEALTH CENTER', 'PRIMARY HEALTH CARE',
                     'PRIMARY HEALTH CLINIC', 'PRIMARY  HEALTH CLINIC',
                     'BASIC HEALTH CLINIC', 'HEALTH CENTRE', 'HEALTH CENTER', 'HEALTH CLINIC',
                     'HEALTH POST', 'COMPREHENSIVE HEALTH CENTRE',
                     'MODEL PRIMARY HEALTH CENTRE', 'MATERNAL AND CHILD HEALTH CLINIC',
                     'GENERAL HOSPITAL', 'MPHC', 'PHC', 'CHC', 'MCH', 'HP']:
            n = re.sub(r'\s*\b' + re.escape(sfx) + r'\b\s*', ' ', n)
        return n.strip()

    kano_both_list = []
    kano_imam_only_list = []
    kano_matched_dhis2 = set()

    for _, row in kano_cmam.iterrows():
        fac_name = str(row["Health Facility Name"]).strip()
        lga = str(row["LGA"]).strip()
        fac_core = normalize_fac_name(fac_name)

        # Try matching with primary data to get admissions
        primary_adm = 0
        if 'kano_primary_active' in dir():
            for _, prow in kano_primary_active.iterrows():
                pname = str(prow["Health Facility Name"]).strip().upper()
                fac_upper = fac_name.upper()
                if pname == fac_upper or pname in fac_upper or fac_upper in pname:
                    primary_adm = int(prow["new_admission"])
                    break

        matched = False
        best_match = None
        best_score = 0

        for d in kano_dhis2_all:
            d_name_raw = d["facility"]
            d_lga = (d.get("lga", "") or "").upper().strip()

            # Must be same LGA
            if not (lga.upper() in d_lga or d_lga in lga.upper()):
                continue

            d_core = normalize_fac_name(d_name_raw)

            # Exact core match
            if fac_core == d_core:
                best_match = d
                best_score = 1.0
                break

            # Substring match on core names
            if len(fac_core) >= 3 and len(d_core) >= 3:
                if fac_core in d_core or d_core in fac_core:
                    score = 0.9
                    if score > best_score:
                        best_match = d
                        best_score = score
                    continue

            # Fuzzy match on core names
            ratio = SequenceMatcher(None, fac_core, d_core).ratio()
            if ratio > best_score and ratio >= 0.6:
                best_match = d
                best_score = ratio

        if best_match and best_score >= 0.6:
            matched = True
            kano_matched_dhis2.add(best_match["facility"])
            kano_both_list.append({
                "facility_name": fac_name, "lga": lga,
                "imam_admissions": primary_adm,
                "dhis2_admitted": best_match.get("sam_admitted", 0) or 0,
                "dhis2_name": best_match["facility"],
                "match_score": round(best_score, 2),
            })

        if not matched:
            kano_imam_only_list.append({
                "facility_name": fac_name, "lga": lga,
                "imam_admissions": primary_adm,
            })

    # DHIS2-only = Kano DHIS2 facilities not matched to any CMAM facility
    kano_dhis2_only_list = [d for d in kano_dhis2_all if d["facility"] not in kano_matched_dhis2]

    print(f"  Kano profile: IMAM-only={len(kano_imam_only_list)}, Both={len(kano_both_list)}, DHIS2-only={len(kano_dhis2_only_list)}")

except Exception as e:
    print(f"  Kano CMAM matching error: {e}")
    import traceback; traceback.print_exc()
    # Fallback to original method
    kano_imam_only_list = [{"facility_name": f["facility_name"], "lga": f["lga_normalized"], "imam_admissions": f["imam_admissions"]}
                           for f in facilities if f["state"] == "Kano" and f["match_status"] != "matched"]
    kano_both_list = []
    kano_dhis2_only_list = []

# Kaduna uses original logic
for state in ["Kaduna"]:
    state_facs = [f for f in facilities if f["state"] == state]
    matched = sum(1 for f in state_facs if f["match_status"] == "matched")
    imam_only = sum(1 for f in state_facs if f["match_status"] != "matched")
    d2only = [d for d in all_dhis2_only if d["state"] == state]
    print(f"  {state}: IMAM-only={imam_only}, Both={matched}, DHIS2-only={len(d2only)}")

# Build facility_profile data for JSON output
facility_profile = {
    "Kaduna": {
        "imam_only": [{"facility_name": f["facility_name"], "lga": f["lga_normalized"], "imam_admissions": f["imam_admissions"]}
                      for f in facilities if f["state"] == "Kaduna" and f["match_status"] != "matched"],
        "both": sum(1 for f in facilities if f["state"] == "Kaduna" and f["match_status"] == "matched"),
        "both_list": [{"facility_name": f["facility_name"], "lga": f["lga_normalized"],
                       "imam_admissions": f["imam_admissions"], "dhis2_admitted": f.get("dhis2_sam_admitted", 0) or 0}
                      for f in facilities if f["state"] == "Kaduna" and f["match_status"] == "matched"],
        "dhis2_only": len([d for d in all_dhis2_only if d["state"] == "Kaduna"]),
        "dhis2_only_list": [{"facility_name": d["facility"], "lga": d.get("lga", ""), "sam_admitted": d.get("sam_admitted", 0) or 0,
                             "sam_treated": d.get("sam_treated", 0) or 0}
                            for d in all_dhis2_only if d["state"] == "Kaduna"],
        "dhis2_only_admissions": sum(d["sam_admitted"] or 0 for d in all_dhis2_only if d["state"] == "Kaduna"),
    },
    "Kano": {
        "imam_only": kano_imam_only_list,
        "both": len(kano_both_list),
        "both_list": kano_both_list,
        "dhis2_only": len(kano_dhis2_only_list),
        "dhis2_only_list": [{"facility_name": d["facility"], "lga": d.get("lga", ""),
                             "sam_admitted": d.get("sam_admitted", 0) or 0, "sam_treated": d.get("sam_treated", 0) or 0}
                            for d in kano_dhis2_only_list],
        "dhis2_only_admissions": sum((d.get("sam_admitted", 0) or 0) for d in kano_dhis2_only_list),
    },
}

# Build LGA-level facility classification for each state
def normalize_lga(name):
    """Normalize LGA names to uppercase, stripping 'kn '/'kd ' prefix."""
    if not name or str(name) == 'nan':
        return 'Unknown'
    import re
    n = str(name).strip().upper()
    n = re.sub(r'^(KN|KD)\s+', '', n)
    return n

for state_key in ["Kaduna", "Kano"]:
    sp = facility_profile[state_key]
    lga_counts = {}
    for f in sp["imam_only"]:
        lga = normalize_lga(f.get("lga", ""))
        lga_counts.setdefault(lga, {"imam_only": 0, "both": 0, "dhis2_only": 0})
        lga_counts[lga]["imam_only"] += 1
    for f in sp["both_list"]:
        lga = normalize_lga(f.get("lga", ""))
        lga_counts.setdefault(lga, {"imam_only": 0, "both": 0, "dhis2_only": 0})
        lga_counts[lga]["both"] += 1
    for f in sp.get("dhis2_only_list", []):
        lga = normalize_lga(f.get("lga", ""))
        lga_counts.setdefault(lga, {"imam_only": 0, "both": 0, "dhis2_only": 0})
        lga_counts[lga]["dhis2_only"] += 1
    sp["lga_breakdown"] = lga_counts
    print(f"  {state_key} LGA breakdown: {len(lga_counts)} LGAs")
    # Verify totals
    total_io = sum(v["imam_only"] for v in lga_counts.values())
    total_b = sum(v["both"] for v in lga_counts.values())
    total_d = sum(v["dhis2_only"] for v in lga_counts.values())
    print(f"    IMAM-only={total_io}, Both={total_b}, DHIS2-only={total_d}, Total={total_io + total_b + total_d}")

# ============================================================
# 14. Write output files
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

with open(OUT_DIR / "facility_profile.json", "w") as f:
    json.dump(facility_profile, f, indent=2, default=str)
print(f"  facility_profile.json written")


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
