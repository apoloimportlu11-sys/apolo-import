#!/usr/bin/env python3
"""Parse LISTA DE PRECIOS MULTIMARCAS Excel → JSON for Supabase import.

Excludes: SAKURA JOSEPH, MANN JOSEPH, MOROSOS.
Preserves sheet order and row order within each sheet.
Catalog curation: all Apolo + Overts; max 20 products per other brand.
"""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / "datos" / "LISTA DE PRECIOS MULTIMARCAS 2026 JUNIO OVERTS.xlsx"
OUT = ROOT / "datos" / "multimarcas-2026-parsed.json"

EXCLUDE = {"SAKURA JOSEPH", "MANN JOSEPH", "MOROSOS"}
FULL_BRANDS = {"Apolo", "Overts"}
MAX_OTHER_BRAND = 20
ZONE_LABELS = {
    "distrital",
    "periferie 1",
    "periferie 2",
    "periferie",
    "perif.1",
    "perif. 1",
    "perif.2",
    "perif. 2",
    "distri.",
    "distri",
    "und",
    "und.",
}

SHEET_BRAND = {
    "REPSOL": "Repsol",
    "0 APOLO": "Apolo",
    "1 OVERTS": "Overts",
    "2 SAKURA": "Sakura",
    "PRESTONE-USA JOSEPH": "Prestone",
    "3 PRESTONE": "Prestone",
    "4 ISHIKAWA": "Ishikawa",
    "5 AMALIE": "Amalie",
    "6 MAN.": "Mann Filter",
    "7 VERSACHEM": "Versachem",
    "9 FILTROS GP": "General Parts",
    "10 DENSO - BUJIAS": "Denso",
    "MAN": "Mann Filter",
    "13 MOTUL": "Motul",
    "14 PASTILLA": "Frenosa",
    "15 TOYOTA": "Toyota",
    "16 FRENOSA LIQUIDO": "Frenosa",
    "FRENOSA A": "Frenosa",
    "FRENOSA B": "Frenosa",
    "17 WAGNER": "Wagner",
    "18 BOSH LIQUIDO": "Bosch",
    "FILTROS BOSCH LIVIANO": "Bosch",
    "FILTROS BOSCH PESADOS": "Bosch",
    "19 BOIL": "Boil",
    "21 CHEVRON": "Chevron",
    "22 HONDA": "Honda",
    "23 3BSI": "3BSI",
    "24 FILTROS LYS": "Lys Filtros",
    "26 BESTE- P.FRENO CERAMICA": "Beste",
    "BESTE- P.FRENO SEVERE": "Beste",
    "PASTILLA FRENOSA ACTUAL": "Frenosa",
    "PASTILLA SHP": "SHP",
    "PASTILLA FRENOSA RESUMIDO": "Frenosa",
    "PASTILLAS FRITEC": "Fritec",
    "FILTROS WILLY BUSH": "Willy Bush",
    "FILTROS FILTECH": "Filtech",
    "FILTRO PUROLATOR": "Purolator",
    "PUROLATOR JUN 2020": "Purolator",
    "FILTECH": "Filtech",
    "FILTROS VIRGINIA": "Virginia",
    "PASTILLAS FRENOSA EDUARDO": "Frenosa",
    "BLOQUES FRENOSA JACKIE": "Frenosa",
    "SEGMENTOS": "Frenosa",
    "FRITEC PAST": "Fritec",
    "FRITEC PATINES": "Fritec",
    "BUJIAS": "Denso",
    "LIQUI MOLY": "Liqui Moly",
    "MOBIL": "Mobil",
    "CASTROL": "Castrol",
    "SHELL": "Shell",
}

# Forced layouts when Excel headers don't match data columns.
FORCED_COLS: dict[str, tuple[int, dict[str, int]]] = {
    "REPSOL": (5, {"code": 0, "name": 1, "pack_qty": 2, "pack": 3, "price": 5}),
    # start includes section banners (GRASAS APOLO / REFRIGERANTES…) before first SKU
    "0 APOLO": (5, {"name": 0, "pack": 1, "price": 3}),
    "1 OVERTS": (4, {"name": 0, "pack": 1, "price": 3}),
    "2 SAKURA": (5, {"name": 0, "application": 1, "pack": 2, "cost": 3}),
    "PRESTONE-USA JOSEPH": (9, {"code": 0, "name": 1, "pack": 2, "price": 5}),
    "3 PRESTONE": (4, {"name": 0, "pack": 1, "price": 4}),
    "4 ISHIKAWA": (10, {"code": 0, "name": 1, "application": 2, "pack": 8, "price": 7}),
    "5 AMALIE": (7, {"name": 0, "pack_qty": 1, "pack": 2, "price": 4}),
    "6 MAN.": (5, {"code": 0, "name": 1, "application": 2, "price": 8}),
    "7 VERSACHEM": (8, {"name": 0, "pack_qty": 1, "pack": 2, "price": 5}),
    "9 FILTROS GP": (4, {"code": 2, "name": 3, "stock": 8, "pack": 10, "price": 15}),
    "10 DENSO - BUJIAS": (9, {"name": 0, "application": 1, "pack": 2, "price": 8}),
    "MAN": (7, {"name": 0, "pack_qty": 1, "pack": 2, "price": 5}),
    "13 MOTUL": (6, {"name": 0, "pack_qty": 1, "pack": 2, "price": 4}),
    "14 PASTILLA": (7, {"name": 0, "pack_qty": 1, "pack": 2, "price": 4}),
    "15 TOYOTA": (6, {"name": 0, "pack_qty": 1, "pack": 2, "price": 4}),
    "16 FRENOSA LIQUIDO": (9, {"code": 0, "name": 1, "pack": 2, "price": 4}),
    "FRENOSA A": (3, {"sku": 0, "code": 1, "row_brand": 2, "application": 3, "year": 4, "material": 5, "price": 6}),
    "FRENOSA B": (2, {"sku": 0, "code": 1, "row_brand": 2, "application": 3, "year": 4, "position": 5, "price": 12}),
    "17 WAGNER": (6, {"name": 0, "pack": 1, "price": 4}),
    "18 BOSH LIQUIDO": (7, {"code": 0, "name": 1, "pack": 2, "price": 5}),
    "FILTROS BOSCH LIVIANO": (11, {"code": 0, "name": 1, "application": 2}),
    "FILTROS BOSCH PESADOS": (11, {"code": 0, "name": 1, "application": 2}),
    "19 BOIL": (6, {"name": 0, "pack": 1, "price": 3}),
    "21 CHEVRON": (7, {"name": 0, "pack": 1, "price": 3}),
    "22 HONDA": (7, {"name": 0, "pack": 1, "price": 3}),
    "23 3BSI": (6, {"name": 0, "pack": 1, "price": 3}),
    "24 FILTROS LYS": (8, {"code": 0, "price": 7}),
    "26 BESTE- P.FRENO CERAMICA": (4, {"code": 0, "name": 1, "material": 2, "position": 3, "price": 7}),
    "BESTE- P.FRENO SEVERE": (4, {"code": 0, "name": 1, "material": 2, "position": 4, "price": 8}),
    "PASTILLA FRENOSA ACTUAL": (6, {"code": 0, "material": 1, "row_brand": 3, "application": 4, "year": 5, "price": 6}),
    "PASTILLA SHP": (5, {"code": 0, "application": 2, "year": 3, "pack": 4, "price": 5}),
    "PASTILLA FRENOSA RESUMIDO": (9, {"code": 0, "name": 1, "pack": 3, "price": 5}),
    "PASTILLAS FRITEC": (3, {"code": 0, "material": 1, "row_brand": 3, "application": 4, "year": 5, "price": 6}),
    "FILTROS WILLY BUSH": (7, {"code": 0, "name": 1, "price": 5}),
    "FILTROS FILTECH": (6, {"name": 0, "code": 2, "price": 3}),
    "FILTRO PUROLATOR": (5, {"code": 0, "name": 1, "price": 4}),
    "PUROLATOR JUN 2020": (5, {"code": 0, "name": 1, "price": 3}),
    "FILTECH": (6, {"code": 0, "price": 4, "application": 12}),
    "FILTROS VIRGINIA": (4, {"code": 0, "name": 1, "price": 4}),
    "PASTILLAS FRENOSA EDUARDO": (5, {"code": 0, "name": 1, "pack": 3, "price": 8}),
    "BLOQUES FRENOSA JACKIE": (5, {"code": 0, "name": 1, "pack": 3, "price": 8}),
    "SEGMENTOS": (5, {"code": 0, "name": 1, "pack": 3, "price": 8}),
    "FRITEC PAST": (5, {"code": 0, "name": 1, "pack": 3, "price": 6}),
    "FRITEC PATINES": (5, {"code": 0, "name": 1, "pack": 3, "price": 6}),
    "BUJIAS": (5, {"code": 0, "name": 1, "pack": 3, "price": 5}),
    "LIQUI MOLY": (13, {"name": 0, "pack": 1, "price": 7}),
    "MOBIL": (7, {"name": 0, "pack": 1, "price": 3}),
    "CASTROL": (9, {"name": 0, "pack": 1, "price": 4}),
    "SHELL": (6, {"name": 0, "pack": 1, "price": 4}),
}


def norm(s: object) -> str:
    if s is None:
        return ""
    text = str(s).replace("\n", " ").strip()
    return re.sub(r"\s+", " ", text)


def sheet_key(name: str) -> str:
    return re.sub(r"\s+", " ", name or "").strip().upper()


def brand_for(name: str) -> str:
    key = sheet_key(name)
    if key in SHEET_BRAND:
        return SHEET_BRAND[key]
    return re.sub(r"^\d+\s*", "", key).title() or "Apolo"


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFD", text.lower())
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "producto"


def as_float(v: object) -> float | None:
    if v is None or v == "" or v in {"#REF!", "#VALUE!", "#N/A"}:
        return None
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    try:
        return float(str(v).strip().replace(",", "."))
    except ValueError:
        return None


def as_int(v: object) -> int | None:
    n = as_float(v)
    if n is None or n < 0:
        return None
    return int(round(n))


def is_number(v: object) -> bool:
    return as_float(v) is not None


def looks_like_code(text: str) -> bool:
    t = text.strip()
    if not t or len(t) > 36:
        return False
    if " " in t and not re.fullmatch(r"[A-Z0-9]+(?:\s+[A-Z0-9]+){0,2}", t):
        # Allow short spaced codes like "PAK 00010", reject long phrases
        if len(t) > 24:
            return False
    if re.fullmatch(r"\d{6,}", t):
        return True
    # Typical SKU patterns
    if re.fullmatch(r"[A-Z]{1,8}[-_./]?\d+[A-Z0-9._/\-]*", t, re.I):
        return True
    if re.fullmatch(r"\d+[A-Z][A-Z0-9._/\-]*", t, re.I):
        return True
    if re.fullmatch(r"[A-Z]{2,}\s+\d{3,}", t, re.I):
        return True
    return False


def is_junk_label(text: str) -> bool:
    t = text.strip().lower()
    junk = {
        "descripcion",
        "descripción",
        "codigo",
        "código",
        "código frenosa",
        "codigo frenosa",
        "pack",
        "flete dist",
        "flete perf1",
        "flete perf2",
        "distri.",
        "perif.1",
        "perif. 2",
        "imagen",
        "plumilla",
        "med.",
        "med",
        "und.",
        "und",
        "unitario",
        "producto",
    }
    return t in junk or t.startswith("porcentaje")


def looks_like_pack(text: str) -> bool:
    t = norm(text).lower()
    if not t:
        return False
    if t in ZONE_LABELS:
        return False
    return bool(
        re.match(
            r"^(caja|balde|bidon|bidón|pza|und|pote|tambor|x\s*\d|gln|gal|lt|lts|\d+\s*x)",
            t,
        )
        or re.search(r"\b(caja|balde|bidon|bidón|galones?|gln|und|pza)\b", t)
    )


def looks_like_zone_label(text: str) -> bool:
    return norm(text).lower() in ZONE_LABELS


def is_section(text: str) -> bool:
    t = norm(text)
    if not t or is_junk_label(t):
        return True
    low = t.lower()
    if looks_like_pack(t):
        return False
    if re.fullmatch(r"(?:[A-Za-zÁÉÍÓÚÑ]\s+){3,}[A-Za-zÁÉÍÓÚÑ]\s*", t):
        return True
    # Category banners (not sellable SKUs)
    section_prefixes = (
        "lubricantes para",
        "aceite para",
        "aceites para",
        "spray para",
        "filtros para",
        "filtros de aire aceite",
        "aditivos para",
        "aditivos de",
        "pastillas de freno",
        "discos de freno",
        "productos aceites",
        "limpieza exterior",
        "refrigerantes",
        "silicona para",
        "shampoo para",
        "shampo para",
        "abrillantador de llantas (",
        "grasas apolo",
        "4t -",
        "motores petroleros",
        "transmiciones",
        "transmisiones",
    )
    if any(low.startswith(s) for s in section_prefixes):
        return True
    # Single banner cell like "ACEITE PARA 2 TIEMPOS (2T )"
    if re.search(r"\bpara\b", low) and len(t.split()) <= 12 and not looks_like_code(t):
        if not re.search(r"\d+\s*(ml|lt|l|gl|gln|oz|onz|kg|und|pza)\b", low):
            return True
    if low in {
        "dot 3",
        "dot 4",
        "dot 5",
        "dot 3 / azul",
        "dot 4 / rojo",
        "grasas apolo",
        "4t - moto apolo",
        "motores petroleros apolo",
        "transmiciones mecanicas apolo",
        "f  i  l  t  r  o  s",
    }:
        return True
    # DOT section banners only (not SKUs like "DOT 3 (4 ONZAS)")
    if re.fullmatch(r"dot\s*[345](?:\s*/\s*\w+)?", low):
        return True
    # Banners ending with brand or establishment scope
    if low.endswith("apolo") or "todo tipo de establecimientos" in low or "lavaderos" in low or "car wash" in low:
        if not looks_like_code(t) and not looks_like_pack(t):
            return True
    # Spaced all-caps banners without product signals
    if t.isupper() and len(t.split()) <= 6 and not re.search(r"\d", t):
        if low.endswith("apolo") or low in {"filtros", "pastillas", "bujias", "bujías", "segmentos"}:
            return True
    return False


def extract_section_banner(row: tuple) -> str | None:
    """Detect Excel section banners, including rows with DISTRITAL/PERIFERIE labels."""
    nonempty = [norm(c) for c in row if norm(c)]
    if not nonempty:
        return None
    first = nonempty[0]
    if looks_like_pack(first) or looks_like_code(first):
        return None
    rest = nonempty[1:]

    # Row like: REFRIGERANTES… | DISTRITAL | PERIFERIE 1 | PERIFERIE 2
    if rest and all(looks_like_zone_label(v) for v in rest):
        return first

    if len(nonempty) == 1 and is_section(first):
        return first

    if len(nonempty) <= 2 and not any(is_number(v) for v in nonempty):
        if is_section(first) and not looks_like_code(first) and not looks_like_pack(first):
            return first

    return None


def detect_category(text: str) -> str:
    t = text.lower()
    if "filtro" in t:
        return "filtros"
    if any(x in t for x in ("pastilla", "disco de freno", "patin", "patín", "zapata", "bloque")):
        return "automovil"
    if any(x in t for x in ("bujia", "bujía", "plumilla", "limpiaparabrisas")):
        return "otros"
    if any(x in t for x in ("aditivo", "flush", "cleaner")):
        return "aditivos"
    if any(x in t for x in ("moto", "2t", "4t")):
        return "motocicleta"
    if any(x in t for x in ("diesel", "petrolero", "camion", "camión", "pesado")):
        return "camiones"
    if any(x in t for x in ("agricola", "agrícola", "tractor")):
        return "agricola"
    return "automovil"


def detect_type(text: str) -> str:
    t = text.lower()
    if "filtro" in t:
        return "Filtro"
    if "pastilla" in t or t.startswith("pak ") or t.startswith("paf "):
        return "Pastilla de freno"
    if "disco" in t:
        return "Disco de freno"
    if "bujia" in t or "bujía" in t:
        return "Bujía"
    if "grasa" in t:
        return "Grasa"
    if any(x in t for x in ("refriger", "coolant", "anticongel", "radiador")):
        return "Refrigerante"
    if any(x in t for x in ("liquido", "líquido", "frex", "dot 3", "dot 4")) and "freno" in t:
        return "Líquido de frenos"
    if "aditivo" in t or "flush" in t:
        return "Aditivo"
    if "plumilla" in t or "limpiaparabrisas" in t:
        return "Plumilla"
    if "hidraul" in t or "hidrául" in t:
        return "Hidráulico"
    if any(x in t for x in ("aceite", "lubric", "sae", "sintetic", "sintétic")) or re.search(
        r"\b\d{1,2}\s*w\s*-?\s*\d{2}\b", t
    ):
        return "Lubricante"
    return "Repuesto"


def detect_viscosity(text: str) -> str | None:
    m = re.search(r"\b(\d{1,2})\s*W\s*-?\s*(\d{2})\b", text, re.I)
    if m:
        return f"{m.group(1)}W-{m.group(2)}"
    if re.search(r"\bDOT\s*-?\s*4\b", text, re.I):
        return "DOT 4"
    if re.search(r"\bDOT\s*-?\s*3\b", text, re.I):
        return "DOT 3"
    if re.search(r"\bATF\b", text, re.I):
        return "ATF"
    return None


def cell(row: tuple, idx: int | None) -> str:
    if idx is None or idx >= len(row):
        return ""
    return norm(row[idx])


def build_name(code: str, name: str, brand: str, application: str, material: str, sheet: str) -> str:
    if name and not is_junk_label(name):
        # Prefer richer labels for brake pads when name is only material
        if material and name.upper() == material.upper() and code:
            parts = [code]
            if brand:
                parts.append(brand)
            if application:
                parts.append(application)
            if material:
                parts.append(f"({material})")
            return " ".join(parts)[:200]
        if not is_section(name):
            return name[:200]

    key = sheet_key(sheet)
    if "FRENOSA" in key or "PASTILLA" in key or "FRITEC" in key or "BESTE" in key or "SHP" in key:
        parts = []
        if code:
            parts.append(str(code))
        if brand:
            parts.append(brand)
        if application:
            parts.append(application)
        if material:
            parts.append(f"({material})")
        built = " ".join(parts).strip()
        if built:
            return built[:200]
    if code and ("LYS" in key or "FILTRO" in key or key in {"6 MAN.", "MAN", "FILTECH"}):
        return (name or f"Filtro {code}")[:200]
    if code and application:
        return f"{code} — {application}"[:200]
    if code:
        return code[:200]
    return (application or material or "Producto")[:200]


def parse_row(row: tuple, cols: dict[str, int], brand: str, sheet: str, section: str) -> dict | None:
    code = cell(row, cols.get("code")) or cell(row, cols.get("sku"))
    name = cell(row, cols.get("name"))
    pack = cell(row, cols.get("pack"))
    pack_qty = cell(row, cols.get("pack_qty"))
    application = cell(row, cols.get("application"))
    material = cell(row, cols.get("material"))
    row_brand = cell(row, cols.get("row_brand"))
    year = cell(row, cols.get("year"))
    position = cell(row, cols.get("position"))
    stock = as_int(row[cols["stock"]]) if "stock" in cols and cols["stock"] < len(row) else None

    if pack_qty and pack and not pack.lower().startswith("x") and not is_number(pack):
        presentation = f"{pack_qty} {pack}".strip()
    elif pack and not is_number(pack) and not is_junk_label(pack):
        presentation = pack
    elif pack_qty and not is_number(pack_qty) and not is_junk_label(pack_qty):
        presentation = pack_qty
    else:
        presentation = position or None
        if presentation and (is_number(presentation) or is_junk_label(presentation)):
            presentation = None

    # Skip pure section / header leftovers
    probe = name or code or application
    if not probe:
        return None
    if is_junk_label(probe):
        return None
    if not code and is_section(probe) and not presentation:
        return None
    if code and is_junk_label(code):
        return None

    # Skip rows without product signal
    price = None
    for key in ("price", "cost"):
        if key in cols and cols[key] < len(row):
            val = as_float(row[cols[key]])
            if val is not None and 0 < val < 1_000_000:
                price = round(val, 2)
                break

    # row_brand en pastillas/discos es marca de vehículo, no del fabricante
    vehicle_brand = row_brand
    final_brand = brand
    app_with_vehicle = application
    if vehicle_brand:
        app_with_vehicle = " | ".join(x for x in (vehicle_brand, application) if x)
    final_name = build_name(code, name, vehicle_brand or "", application, material, sheet)

    if not final_name or is_junk_label(final_name) or final_name.lower() == "producto":
        return None
    if is_section(final_name) and not code:
        return None
    if not code and not presentation and price is None and not application and not material:
        if not re.search(r"\d|W-|SAE|DOT|API|GL-", final_name, re.I):
            return None

    app_text = " | ".join([x for x in (app_with_vehicle, material, position, year) if x]) or None
    # short_description = Excel section banner only (never pack / presentation)
    short = section.strip() if section and section.strip() else None
    blob = f"{final_name} {presentation or ''} {app_text or ''} {section or ''} {sheet}"
    ptype = detect_type(blob)
    # Brake-pad sheets default type
    key = sheet_key(sheet)
    if ptype == "Repuesto" and any(x in key for x in ("PASTILLA", "FRITEC", "BESTE", "FRENOSA A", "SHP")):
        ptype = "Pastilla de freno"
    if ptype == "Repuesto" and "FRENOSA B" in key:
        ptype = "Disco de freno"
    if ptype == "Repuesto" and ("FILTRO" in key or key in {"6 MAN.", "MAN", "24 FILTROS LYS", "FILTECH"}):
        ptype = "Filtro"

    description = (
        f"Descripción pendiente de actualización. "
        f"Producto de catálogo {final_brand}"
        + (f" · código {code}" if code else "")
        + ". Información técnica se completará más adelante."
    )

    return {
        "brand": final_brand,
        "name": final_name,
        "code": code or None,
        "presentation": (presentation[:200] if presentation else None),
        "application": (app_text[:500] if app_text else None),
        "short_description": (short[:500] if short else None),
        "description": description,
        "viscosity": detect_viscosity(blob),
        "type": ptype,
        "category_id": detect_category(blob),
        "stock": stock if stock is not None else 0,
        "price": price,
        "sheet": sheet_key(sheet).title() if False else sheet.strip(),
        "section": section or None,
    }


def parse_sheet(ws, sheet_name: str) -> list[dict]:
    brand = brand_for(sheet_name)
    key = sheet_key(sheet_name)
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []

    if key in FORCED_COLS:
        start, cols = FORCED_COLS[key]
    else:
        start, cols = 0, {"name": 0, "pack": 1}

    products: list[dict] = []
    section = ""
    for row in rows[start:]:
        if not any(norm(c) for c in row):
            continue

        banner = extract_section_banner(row)
        if banner:
            section = banner
            continue

        parsed = parse_row(row, cols, brand, sheet_name, section)
        if parsed:
            products.append(parsed)
    return products


def apply_brand_cap(products: list[dict]) -> tuple[list[dict], dict[str, int]]:
    """Keep all Apolo/Overts; max MAX_OTHER_BRAND for every other brand (Excel order)."""
    kept: list[dict] = []
    per_brand: dict[str, int] = {}
    capped: dict[str, int] = {}
    for p in products:
        brand = str(p.get("brand") or "Apolo")
        n = per_brand.get(brand, 0)
        if brand in FULL_BRANDS or n < MAX_OTHER_BRAND:
            kept.append(p)
            per_brand[brand] = n + 1
        else:
            capped[brand] = capped.get(brand, 0) + 1
    return kept, capped


def main() -> None:
    wb = load_workbook(XLSX, read_only=True, data_only=True)
    all_products: list[dict] = []
    stats: list[dict] = []

    for sheet_name in wb.sheetnames:
        key = sheet_key(sheet_name)
        if key in EXCLUDE or key.startswith("MOROSOS"):
            stats.append({"sheet": sheet_name, "skipped": True, "count": 0})
            continue
        items = parse_sheet(wb[sheet_name], sheet_name)
        stats.append({"sheet": sheet_name, "skipped": False, "count": len(items)})
        all_products.extend(items)
    wb.close()

    curated, capped = apply_brand_cap(all_products)

    seen_slugs: set[str] = set()
    payload = []
    for idx, p in enumerate(curated):
        sort_order = idx + 1
        base = slugify(
            "-".join(x for x in [p["brand"], p.get("code") or "", p["name"], p.get("presentation") or ""] if x)
        )[:80] or f"prod-{sort_order}"
        slug = base
        n = 1
        while slug in seen_slugs:
            slug = f"{base}-{n}"
            n += 1
        seen_slugs.add(slug)
        pid = f"xlsx-{sort_order:05d}-{slug[:40]}"
        payload.append(
            {
                "id": pid,
                "name": p["name"],
                "slug": slug,
                "brand": p["brand"],
                "short_description": p.get("short_description"),
                "presentation": p.get("presentation"),
                "viscosity": p.get("viscosity"),
                "type": p.get("type"),
                "subcategory": p.get("application"),
                "description": p.get("description"),
                "stock": p.get("stock") or 0,
                "price": p.get("price"),
                "is_featured": False,
                "is_active": True,
                "category_id": p.get("category_id") or "automovil",
                "image_url": "/imagen-no-encontrada.svg",
                "image_is_placeholder": True,
                "sort_order": sort_order,
                "line_group_id": None,
                "code": p.get("code"),
                "sheet": p.get("sheet"),
            }
        )

    OUT.write_text(
        json.dumps(
            {
                "stats": stats,
                "capped_dropped": capped,
                "products": payload,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    from collections import Counter

    brand_counts = Counter(p["brand"] for p in payload)
    print(f"Wrote {len(payload)} products → {OUT}")
    print(f"  Apolo={brand_counts.get('Apolo', 0)} Overts={brand_counts.get('Overts', 0)} brands={len(brand_counts)}")
    for s in stats:
        flag = "SKIP" if s["skipped"] else f"{s['count']:5d}"
        print(f"  {flag}  {s['sheet']}")
    if capped:
        print("Capped (dropped extras beyond 20/brand):")
        for brand, n in sorted(capped.items(), key=lambda x: -x[1])[:15]:
            print(f"  -{n:4d}  {brand}")


if __name__ == "__main__":
    main()
