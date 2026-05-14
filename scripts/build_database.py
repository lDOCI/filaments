#!/usr/bin/env python3
"""
Build the full filaments.json from collected sources.

Sources used:
- Existing reference (Russian brands): https://github.com/lDOCI/lDOCI.github.io/blob/main/filaments_data/filaments.json
- Scuk's Printables catalog (200+ entries): https://www.printables.com/model/464663-empty-spool-weight-catalog
- MatterHackers KB: https://help.matterhackers.com/article/129-empty-spool-weights
- printermaterials.com Empty Spool Weight DB: https://printermaterials.com/empty-spool-weight-database/
- stldenise3d: https://stldenise3d.com/how-much-do-empty-spools-weigh/
- goughlui.com: https://goughlui.com/2022/03/05/notes-3d-printer-filament-spool-weights/
- Polymaker wiki, Prusament forum, eSUN/SUNLU forum, Anycubic/Elegoo searches, 3dtoday (PrintProduct)
"""
import json, os, re
from pathlib import Path

# --- Density table (g/cm^3), used to compute remaining length from remaining mass ---
DENSITY = {
    'PLA': 1.24, 'PLA+': 1.24, 'PLA Matte': 1.24, 'PLA Silk': 1.27, 'PLA-CF': 1.30,
    'PETG': 1.27, 'PETG-CF': 1.31, 'PET': 1.38, 'PET-CF': 1.41,
    'ABS': 1.04, 'ABS+': 1.06, 'ASA': 1.07, 'HIPS': 1.04,
    'TPU': 1.21, 'NYLON': 1.14, 'PA-CF': 1.18, 'PA6-GF30': 1.30,
    'PC': 1.20, 'PEEK': 1.32, 'PEI': 1.27, 'PP': 0.90, 'SBS': 1.01, 'SAN': 1.08,
    'RUBBER': 1.20, 'WAX': 0.95, 'WOOD': 1.28, 'METAL': 2.30,
    'SUPPORT': 1.20, 'PVA': 1.23, 'BVOH': 1.20,
}

# --- Manufacturer → country ---
COUNTRY = {
    # Russia
    'Bestfilament': 'RU', 'FDplast': 'RU', 'FILAMENTARNO!': 'RU', 'REC': 'RU',
    'U3Print': 'RU', 'MAKO': 'RU', 'EXOFLEX': 'RU', 'CYBERFIBER': 'RU',
    'НИТ': 'RU', 'SynTech': 'RU', 'Hi-Tech Plast': 'RU',
    'Некрасовский полимер': 'RU', 'СТРИМПЛАСТ': 'RU', 'ABS Maker': 'RU',
    'SolidFilament': 'RU', 'MY3D': 'RU', 'PRINT PRODUCT': 'RU', 'PrintProduct': 'RU',
    'SEM': 'RU', '123 3D': 'RU',
    'DEXP': 'RU',  # бренд DNS, китайский OEM, но продаётся как российский
    'Geek Filament': 'RU', 'INFILL': 'RU', 'ATECO': 'RU',
    'Tiger3D': 'RU', 'Plexiwire': 'UA',
    'SEM3D': 'RU', 'Element3D': 'RU',
    'Kremen': 'RU', 'StarPlast': 'RU', 'Lider-3D': 'RU', 'Greg': 'RU',
    '3D Club': 'RU', 'ПолиИмпэкс (IRIS)': 'RU', 'Novaprint 3D': 'RU',
    'Мастер-пластер': 'RU', 'VolPrint': 'RU', 'Clotho Filaments': 'RU',
    'R-filament': 'RU', 'Царь3D': 'RU', 'TingerPlast': 'RU',
    '3DMall': 'RU', 'Chempion24': 'RU', 'Roboparts': 'RU',
}

# Official websites by manufacturer
BRAND_WEBSITE = {
    'Bestfilament': 'https://bestfilament.ru/',
    'FDplast': 'https://www.fdplast.ru/',
    'REC': 'https://rec3d.ru/',
    'FILAMENTARNO!': 'https://filamentarno.ru/',
    'U3Print': 'https://u3print.com/',
    'PrintProduct': 'https://printproduct3d.ru/',
    'CYBERFIBER': 'https://www.cyberfiber.ru/',
    'НИТ': 'https://plastik-nit.ru/',
    'SynTech': 'https://syntechlab.ru/',
    'Hi-Tech Plast': 'https://h-t-p.ru/',
    'MAKO': 'https://elina-volga.ru/',
    'EXOFLEX': 'https://exoflex.ru/',
    'SEM3D': 'https://sem3d.ru/',
    'Element3D': 'https://www.element3d.ru/',
    'Kremen': 'https://kremen.ru/',
    'StarPlast': 'https://star-plast.com/',
    'Lider-3D': 'https://lider-3d.ru/',
    'Greg': 'https://greg-3d.ru/',
    '3D Club': 'https://3d-club.ru/',
    'ПолиИмпэкс (IRIS)': 'https://plastic3d.pro/',
    'Novaprint 3D': 'https://novaprint3d.ru/',
    'Мастер-пластер': 'http://masterplaster.ru/',
    'VolPrint': 'https://volprint.shop/',
    'Clotho Filaments': 'https://www.clothofilaments.ru/',
    'R-filament': 'https://r-filament.ru/',
    'Царь3D': 'https://tsar3d.ru/',
    'TingerPlast': 'https://tingerplast.ru/',
    '3DMall': 'https://3d-m.ru/',
    'Chempion24': 'https://chempion24.ru/',
    'Roboparts': 'https://roboparts.ru/',
    'СТРИМПЛАСТ': 'https://www.sp3d.ru/',
    'Tiger3D': 'https://tiger3d.com/',
    'Plexiwire': 'https://shop.plexiwire.com.ua/',
    'DEXP': 'https://dexp.club/',
    'ABS Maker': 'https://absmaker.ru/',
    'Некрасовский полимер': 'https://nekrasovskiy-polimer.ru/',
    'MY3D': 'https://my3d.art/',
    # International
    'Bambu Lab': 'https://bambulab.com/',
    'Polymaker': 'https://polymaker.com/',
    'Prusament': 'https://prusament.com/',
    'eSUN': 'https://www.esun3d.com/',
    'SUNLU': 'https://www.sunlu.com/',
    'Creality': 'https://www.creality.com/',
    'Anycubic': 'https://www.anycubic.com/',
    'Elegoo': 'https://www.elegoo.com/',
    'Overture': 'https://overture3d.com/',
    'Hatchbox': 'https://www.hatchbox3d.com/',
    'Inland': 'https://www.microcenter.com/',
    'ColorFabb': 'https://colorfabb.com/',
    'Fillamentum': 'https://fillamentum.com/',
    'Das Filament': 'https://dasfilament.de/',
    'Extrudr': 'https://extrudr.com/',
    'Fiberlogy': 'https://fiberlogy.com/',
    'Spectrum': 'https://spectrumfilaments.com/',
    'FormFutura': 'https://www.formfutura.com/',
    'Filament PM': 'https://filament-pm.com/',
    'UltiMaker': 'https://ultimaker.com/',
    'JAYO': 'https://jayo3d.com/',
    'Atomic Filament': 'https://atomicfilament.com/',
    'MatterHackers': 'https://www.matterhackers.com/',
    'ProtoPasta': 'https://www.proto-pasta.com/',
    '3D Fuel': 'https://www.3dfuel.com/',
    'Rosa3D': 'https://rosa3d.pl/',
    'AzureFilm': 'https://azurefilm.com/',
    'Amazon Basics': 'https://www.amazon.com/',
    'MonoPrice': 'https://www.monoprice.com/',
    'Cookie Cad': 'https://cookiecad.com/',
    'NinjaTek': 'https://ninjatek.com/',
    'Amolen': 'https://amolen.com/',
    'Kexcelled': 'https://kexcelled.com/',
    'FlashForge': 'https://www.flashforge.com/',
    'Voxelab': 'https://www.voxelab3dp.com/',
    'Sovol': 'https://www.sovol3d.com/',
    'Snapmaker': 'https://snapmaker.com/',
    'Qidi': 'https://qidi3d.com/',
    'Raise3D': 'https://www.raise3d.com/',
    '3DJake': 'https://www.3djake.com/',
    'Verbatim': 'https://www.verbatim.com/',
    'ZYLtech': 'https://zyltech.com/',
    'Ziro': 'https://ziro3d.com/',
    'Devil Designs': 'https://devildesign.com/',
    'HP 3D': 'https://www.hp.com/',
    'Kingroon': 'https://kingroon.com/',
    'Geeetech': 'https://www.geeetech.com/',
    'Eryone': 'https://www.eryone3d.com/',
    '3DXTech': 'https://www.3dxtech.com/',
}

# Patch COUNTRY with international brands (these were lost when BRAND_WEBSITE was inserted).
COUNTRY.update({
    # China
    'eSUN': 'CN', 'SUNLU': 'CN', 'Creality': 'CN', 'PopBit': 'CN',
    'Geeetech': 'CN', 'ERYONE': 'CN', 'Eryone': 'CN', 'Kingroon': 'CN',
    'Anycubic': 'CN', 'Elegoo': 'CN', 'Bambu Lab': 'CN', 'Jayo': 'CN',
    'Overture': 'CN', 'Hatchbox': 'CN', 'JAYO': 'CN', 'TINMORRY': 'CN',
    'Wanhao': 'CN', 'FlashForge': 'CN', 'Voxelab': 'CN', 'Sovol': 'CN',
    'Comgrow': 'CN', 'Mika3D': 'CN', 'ZIRO': 'CN',
    'ZYLtech': 'CN', 'Voolt3D': 'CN', 'Kexcelled': 'CN', 'Ziro': 'CN',
    'Snapmaker': 'CN', 'Qidi': 'CN',
    # USA
    'Atomic Filament': 'US', 'MatterHackers': 'US', 'Inland': 'US',
    '3D Solutech': 'US', 'MonoPrice': 'US', 'NinjaFlex': 'US', 'ProtoPasta': 'US',
    'Push Plastic': 'US', '3DXTech': 'US', '3D Fuel': 'US',
    'Amazon Basics': 'US', 'Jessie': 'US', 'Cookie Cad': 'US',
    'Sainsmart': 'US', 'Taulman': 'US', 'NinjaTek': 'US',
    'Raise3D': 'US', 'Raised 3D': 'US', 'Amolen': 'US',
    # Europe
    'Prusament': 'CZ', 'Fillamentum': 'CZ', 'Filament PM': 'CZ', 'AURAPOL': 'CZ',
    'Polymaker': 'NL', 'PolyMaker': 'NL', 'ColorFabb': 'NL', 'Colorfabb': 'NL',
    'FormFutura': 'NL', 'UltiMaker': 'NL',
    'Das Filament': 'DE', 'Extrudr': 'AT', '3DJake': 'AT', '3D Jake': 'AT',
    'AzureFilm': 'SI', 'Azurefilm': 'SI',
    'Fiberlogy': 'PL', 'Spectrum': 'PL', 'Rosa3D': 'PL', 'Devil Designs': 'PL',
    'Sakata3D': 'ES', 'Winkle': 'ES', 'BQ': 'ES',
    'Verbatim': 'JP',
    'XYZ Printing': 'TW',
    'HP 3D': 'US',
})

# --- Default spool dimensions by spool type (cardboard vs plastic) ---
SPOOL_DEFAULTS = {
    'cardboard': {'spoolDiameter': 200, 'spoolWidth': 55, 'spoolInnerDiameter': 53},
    'plastic':   {'spoolDiameter': 200, 'spoolWidth': 70, 'spoolInnerDiameter': 53},
    'refill':    {'spoolDiameter': 100, 'spoolWidth': 65, 'spoolInnerDiameter': 80},
}

def slug(*parts):
    s = '_'.join(parts).lower()
    s = re.sub(r'[^a-z0-9а-я]+', '_', s).strip('_')
    return s

def marketplace_links(manufacturer, material, country):
    """Build search URLs for the major marketplaces relevant to RU users."""
    import urllib.parse as up
    q = f'{manufacturer} {material}'.strip()
    qenc = up.quote(q)
    links = {}
    if country in ('RU', 'UA', 'BY') or country == 'CN':
        links['ozon'] = f'https://www.ozon.ru/category/plastik-dlya-3d-printera-15794/?text={qenc}'
        links['wb']   = f'https://www.wildberries.ru/catalog/0/search.aspx?search={qenc}'
    if country in ('CN', '—'):
        links['ali']  = f'https://aliexpress.ru/wholesale?SearchText={qenc}'
    elif country not in ('RU', 'UA', 'BY'):
        # International users
        links['ali']  = f'https://aliexpress.com/wholesale?SearchText={qenc}'
    site = BRAND_WEBSITE.get(manufacturer)
    if site:
        links['website'] = site
    return links

# ---------- 1. Existing Russian dataset ----------
def load_existing():
    p = Path(__file__).parent.parent / 'reference_filaments.json'
    if not p.exists():
        return []
    return json.loads(p.read_text(encoding='utf-8'))

# ---------- 2. New data manually transcribed from sources ----------
# Format: (manufacturer, material, netWeight g, spoolWeight g, diameter mm, spoolType, source_url, color/note)
NEW_DATA = [
    # ============ BAMBU LAB ============
    # Plastic refillable spool (older White) + refill cardboard core
    ('Bambu Lab', 'PLA Basic',   1000, 210, 1.75, 'plastic',   'https://toddpearsall.com/2024/03/bambu-lab-spool-weights/', 'white'),
    ('Bambu Lab', 'PLA Basic',   1000, 219, 1.75, 'plastic',   'https://toddpearsall.com/2024/03/bambu-lab-spool-weights/', 'transparent'),
    # NB: refill (37г картонной втулки) намеренно убран — это не катушка, а сердечник для перенамотки.
    ('Bambu Lab', 'PLA Matte',   1000, 210, 1.75, 'plastic',   'https://toddpearsall.com/2024/03/bambu-lab-spool-weights/', ''),
    ('Bambu Lab', 'PLA Silk',    1000, 219, 1.75, 'plastic',   'https://toddpearsall.com/2024/03/bambu-lab-spool-weights/', ''),
    ('Bambu Lab', 'PETG HF',     1000, 219, 1.75, 'plastic',   'https://toddpearsall.com/2024/03/bambu-lab-spool-weights/', 'transparent'),
    ('Bambu Lab', 'PETG-CF',     1000, 250, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', 'low-temp clear ~250g'),
    ('Bambu Lab', 'ABS',         1000, 216, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', 'high-temp grey'),
    ('Bambu Lab', 'ASA',         1000, 216, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', 'high-temp grey'),
    ('Bambu Lab', 'PA-CF',       1000, 216, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', 'high-temp grey'),
    ('Bambu Lab', 'PET-CF',      1000, 216, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', 'high-temp grey'),
    ('Bambu Lab', 'TPU',         1000, 253, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', 'white spool 253g'),
    ('Bambu Lab', 'SUPPORT',     500,  253, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ POLYMAKER ============
    ('Polymaker', 'PolyTerra PLA',  500,  190, 1.75, 'cardboard', 'https://wiki.polymaker.com/printing-tips/common-printing-issues/running-out-of-filament', ''),
    ('Polymaker', 'PolyTerra PLA',  750,  125, 1.75, 'cardboard', 'https://wiki.polymaker.com/printing-tips/common-printing-issues/running-out-of-filament', ''),
    ('Polymaker', 'PolyTerra PLA',  1000, 140, 1.75, 'cardboard', 'https://wiki.polymaker.com/printing-tips/common-printing-issues/running-out-of-filament', ''),
    ('Polymaker', 'PolyTerra PLA',  2000, 370, 1.75, 'cardboard', 'https://wiki.polymaker.com/printing-tips/common-printing-issues/running-out-of-filament', ''),
    ('Polymaker', 'PolyTerra PLA',  3000, 425, 1.75, 'cardboard', 'https://wiki.polymaker.com/printing-tips/common-printing-issues/running-out-of-filament', ''),
    ('Polymaker', 'PolyLite PLA',   1000, 235, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Polymaker', 'PolyMax PLA',    1000, 245, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Polymaker', 'PolyLite ABS',   1000, 235, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Polymaker', 'PolyLite PETG',  1000, 235, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Polymaker', 'PolyMide PA',    1000, 245, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Polymaker', 'PolyMax PC',     1000, 245, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Polymaker', 'Fiberon (cardboard)', 1000, 168, 1.75, 'cardboard', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ PRUSAMENT ============
    ('Prusament', 'PLA',  1000, 201, 1.75, 'cardboard', 'https://forum.prusa3d.com/forum/english-forum-general-discussion-announcements-and-releases/empty-spool-weight/', 'cardboard core + plastic sides'),
    ('Prusament', 'PETG', 1000, 194, 1.75, 'cardboard', 'https://forum.prusa3d.com/forum/english-forum-general-discussion-announcements-and-releases/weight-of-prusament-petg-spool/', ''),
    ('Prusament', 'ASA',  1000, 201, 1.75, 'cardboard', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Prusament', 'PC',   1000, 201, 1.75, 'cardboard', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Prusament', 'PVB',  500,  201, 1.75, 'cardboard', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Prusament', 'PLA',  2000, 209, 1.75, 'cardboard', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ ESUN ============
    ('eSUN', 'PLA+',     1000, 224, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', 'black/clear ~209-265'),
    ('eSUN', 'PLA',      1000, 224, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('eSUN', 'PETG',     1000, 224, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('eSUN', 'ABS+',     1000, 224, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('eSUN', 'TPU',      1000, 224, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('eSUN', 'PLA+',     500,  210, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('eSUN', 'eSpool+',  1000, 212, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('eSUN', 'PLA cardboard', 1000, 160, 1.75, 'cardboard', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', '~147-175'),
    ('eSUN', 'PLA+',     2500, 634, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ SUNLU ============
    ('SUNLU', 'PLA',         1000, 185, 1.75, 'plastic', 'https://www.amazon.com/ask/questions/TxSWH72G3ULWZN/', 'official ~185g'),
    ('SUNLU', 'PLA+ (v2)',   1000, 178, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', 'v2 spool'),
    ('SUNLU', 'PLA+ (v3)',   1000, 188, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', 'v3 spool'),
    ('SUNLU', 'PETG',        1000, 185, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('SUNLU', 'ABS',         1000, 185, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('SUNLU', 'TPU',         500,  95,  1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('SUNLU', 'PLA',         250,  55,  1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('SUNLU', 'PLA Cardboard 3.0', 1000, 226, 1.75, 'cardboard', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', '3.0 with cardboard'),

    # ============ CREALITY ============
    ('Creality', 'Hyper PLA', 1000, 155, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', '~135-207 range, avg'),
    ('Creality', 'CR-PLA',    1000, 140, 1.75, 'plastic', 'https://stldenise3d.com/how-much-do-empty-spools-weigh/', ''),
    ('Creality', 'Ender PLA', 1000, 140, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Creality', 'Hyper PETG',1000, 155, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Creality', 'Hyper ABS', 1000, 155, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Creality', 'PLA Cardboard', 1000, 170, 1.75, 'cardboard', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ ANYCUBIC ============
    ('Anycubic', 'PLA',          1000, 127, 1.75, 'plastic',   'https://goughlui.com/2022/03/05/notes-3d-printer-filament-spool-weights/', 'rebrand SUNLU light'),
    ('Anycubic', 'PLA cardboard',1000, 125, 1.75, 'cardboard', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Anycubic', 'PETG',         1000, 127, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Anycubic', 'ABS',          1000, 127, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ ELEGOO ============
    ('Elegoo', 'PLA',           1000, 154, 1.75, 'plastic',   'https://www.onlyspoolz.com/portfolio/spool-elegoo-pla/', '±10g'),
    ('Elegoo', 'PLA cardboard', 1000, 155, 1.75, 'cardboard', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', '~145-171'),
    ('Elegoo', 'PETG',          1000, 154, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Elegoo', 'Rapid PLA+',    1000, 154, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Elegoo', 'PLA light',     1000, 113, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', '~111-116'),

    # ============ OVERTURE ============
    ('Overture', 'PLA',           1000, 237, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Overture', 'PLA cardboard', 1000, 160, 1.75, 'cardboard', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', '~150-174'),
    ('Overture', 'PETG',          1000, 237, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Overture', 'ABS',           1000, 237, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Overture', 'Matte PLA',     1000, 237, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Overture', 'Silk PLA',      1000, 237, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ HATCHBOX ============
    ('Hatchbox', 'PLA',  1000, 244, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', '~225-244'),
    ('Hatchbox', 'PETG', 1000, 244, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Hatchbox', 'ABS',  1000, 226, 1.75, 'plastic', 'https://help.matterhackers.com/article/129-empty-spool-weights', ''),
    ('Hatchbox', 'TPU',  1000, 244, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ INLAND (Micro Center) ============
    ('Inland', 'PLA',           1000, 215, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', 'clear'),
    ('Inland', 'PLA black',     1000, 224, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Inland', 'PLA cardboard', 1000, 142, 1.75, 'cardboard', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Inland', 'PETG',          1000, 215, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Inland', 'ABS',           1000, 215, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Inland', 'TPU',           1000, 215, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ COLORFABB ============
    ('ColorFabb', 'PLA/PHA',  750,  236, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('ColorFabb', 'PLA/PHA',  1000, 236, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('ColorFabb', 'XT (PETG)',750,  236, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('ColorFabb', 'HT (PET)', 750,  236, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('ColorFabb', 'Cardboard',750,  152, 1.75, 'cardboard', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('ColorFabb', 'PLA bulk', 2200, 600, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('ColorFabb', 'PLA bulk', 4500, 700, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ FILLAMENTUM ============
    ('Fillamentum', 'PLA Extrafill',   750,  235, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Fillamentum', 'PLA Extrafill',   1000, 230, 1.75, 'plastic', 'https://stldenise3d.com/how-much-do-empty-spools-weigh/', ''),
    ('Fillamentum', 'CPE HG100',       750,  230, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Fillamentum', 'Nylon CF15',      600,  230, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Fillamentum', 'Vinyl 303',       750,  230, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ DAS FILAMENT ============
    ('Das Filament', 'PLA',  1000, 211, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Das Filament', 'PETG', 1000, 211, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ EXTRUDR ============
    ('Extrudr', 'GreenTEC',    1000, 250, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', '~244-259'),
    ('Extrudr', 'PLA NX2',     1000, 250, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Extrudr', 'PETG',        1000, 250, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ FIBERLOGY ============
    ('Fiberlogy', 'EasyPLA',  850,  260, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Fiberlogy', 'EasyPETG', 850,  260, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Fiberlogy', 'ABS',      850,  260, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Fiberlogy', 'Nylon PA12', 750, 260, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Fiberlogy', 'Donut',    1000, 322, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ SPECTRUM ============
    ('Spectrum', 'PLA Premium',  1000, 257, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Spectrum', 'PETG',         1000, 257, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Spectrum', 'ABS',          1000, 257, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Spectrum', 'PLA cardboard',1000, 180, 1.75, 'cardboard', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Spectrum', 'PLA bulk',     2000, 600, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ FORMFUTURA ============
    ('FormFutura', 'EasyFil PLA', 750, 212, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('FormFutura', 'PLA cardboard', 1000, 155, 1.75, 'cardboard', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ FILAMENT PM ============
    ('Filament PM', 'PLA',  1000, 224, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Filament PM', 'PLA',  750,  230, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Filament PM', 'PLA',  500,  208, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Filament PM', 'PLA',  300,  131, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Filament PM', 'PETG', 1000, 224, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ ULTIMAKER ============
    ('UltiMaker', 'PLA',  750, 232, 2.85, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('UltiMaker', 'PLA',  1000, 235, 2.85, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('UltiMaker', 'PETG', 750, 232, 2.85, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('UltiMaker', 'ABS',  750, 232, 2.85, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('UltiMaker', 'TPU 95A', 750, 232, 2.85, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('UltiMaker', 'Nylon', 750, 232, 2.85, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ JAYO ============
    ('JAYO', 'PLA',           1000, 126, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('JAYO', 'PLA cardboard', 1000, 128, 1.75, 'cardboard', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', '~120-135'),
    ('JAYO', 'PETG',          1000, 126, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('JAYO', 'PLA',           250,  58,  1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ ATOMIC FILAMENT ============
    ('Atomic Filament', 'PLA',  1000, 306, 1.75, 'plastic', 'https://help.matterhackers.com/article/129-empty-spool-weights', '~272-323'),
    ('Atomic Filament', 'PETG', 1000, 306, 1.75, 'plastic', 'https://help.matterhackers.com/article/129-empty-spool-weights', ''),

    # ============ MATTERHACKERS ============
    ('MatterHackers', 'Build PLA',  1000, 215, 1.75, 'plastic', 'https://help.matterhackers.com/article/129-empty-spool-weights', ''),
    ('MatterHackers', 'Build PETG', 1000, 215, 1.75, 'plastic', 'https://help.matterhackers.com/article/129-empty-spool-weights', ''),
    ('MatterHackers', 'Build ABS',  1000, 215, 1.75, 'plastic', 'https://help.matterhackers.com/article/129-empty-spool-weights', ''),
    ('MatterHackers', 'Pro PLA',    1000, 312, 1.75, 'plastic', 'https://help.matterhackers.com/article/129-empty-spool-weights', ''),
    ('MatterHackers', 'Quantum PLA',1000, 217, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ PROTOPASTA ============
    ('ProtoPasta', 'HTPLA',     500,  84,  1.75, 'cardboard', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('ProtoPasta', 'HTPLA',     1000, 80,  1.75, 'cardboard', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('ProtoPasta', 'Composite', 500,  84,  1.75, 'cardboard', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', 'wood/metal/carbon-fill'),

    # ============ 3D FUEL ============
    ('3D Fuel', 'PLA',  1000, 264, 1.75, 'plastic', 'https://stldenise3d.com/how-much-do-empty-spools-weigh/', ''),
    ('3D Fuel', 'PETG', 1000, 264, 1.75, 'plastic', 'https://stldenise3d.com/how-much-do-empty-spools-weigh/', ''),

    # ============ ROSA3D ============
    ('Rosa3D', 'PLA Starter', 1000, 245, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Rosa3D', 'PET-G Standard', 1000, 245, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Rosa3D', 'ASA',          1000, 245, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ AZUREFILM ============
    ('AzureFilm', 'PLA',  1000, 232, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('AzureFilm', 'PETG', 1000, 232, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('AzureFilm', 'ABS',  1000, 232, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('AzureFilm', 'TPU 98A', 300, 163, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ AMAZON BASICS / MONOPRICE ============
    ('Amazon Basics', 'PLA',  1000, 220, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', '~190-234'),
    ('Amazon Basics', 'PETG', 1000, 220, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('MonoPrice', 'PLA',  1000, 221, 1.75, 'plastic', 'https://help.matterhackers.com/article/129-empty-spool-weights', ''),

    # ============ COOKIE CAD / NINJATEK ============
    ('Cookie Cad', 'PLA', 1000, 175, 1.75, 'plastic', 'https://stldenise3d.com/how-much-do-empty-spools-weigh/', ''),
    ('NinjaTek', 'NinjaFlex TPU', 500, 329, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ AMOLEN ============
    ('Amolen', 'PLA',          1000, 170, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', '~150-190'),
    ('Amolen', 'PLA',          800,  60,  1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', '~59-62 lightweight'),

    # ============ KEXCELLED ============
    ('Kexcelled', 'PLA',           1000, 240, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Kexcelled', 'PLA cardboard', 1000, 204, 1.75, 'cardboard', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ FLASHFORGE / VOXELAB / SOVOL ============
    ('FlashForge', 'PLA',  1000, 168, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', '~164-173'),
    ('Voxelab', 'PLA',     1000, 171, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Sovol', 'PLA cardboard', 1000, 145, 1.75, 'cardboard', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Snapmaker', 'PLA cardboard', 1000, 148, 1.75, 'cardboard', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ QIDI ============
    ('Qidi', 'PLA',  500,  190, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Qidi', 'PLA',  1000, 193, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ RAISE3D ============
    ('Raise3D', 'Industrial PLA', 1000, 246, 1.75, 'plastic', 'https://stldenise3d.com/how-much-do-empty-spools-weigh/', ''),
    ('Raise3D', 'Hyper Speed PLA', 1000, 246, 1.75, 'plastic', 'https://stldenise3d.com/how-much-do-empty-spools-weigh/', ''),

    # ============ 3DJAKE ============
    ('3DJake', 'EcoPLA', 1000, 220, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', '~210-240'),
    ('3DJake', 'EcoPLA cardboard', 1000, 209, 1.75, 'cardboard', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('3DJake', 'EcoPLA Matte', 250, 91, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ VERBATIM ============
    ('Verbatim', 'PLA',  1000, 220, 1.75, 'plastic', 'https://spoolweight.github.io/', ''),
    ('Verbatim', 'BVOH', 500, 220, 1.75, 'plastic', 'https://spoolweight.github.io/', ''),

    # ============ ZYLTECH / ZIRO / DEVIL DESIGNS ============
    ('ZYLtech', 'PLA', 1000, 179, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Ziro', 'PLA',    1000, 200, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', '~166-226'),
    ('Devil Designs', 'PLA', 1000, 256, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ HP 3D PRINTING ============
    ('HP 3D', 'PLA',  1000, 187, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ KINGROON / GEEETECH / ERYONE ============
    ('Kingroon', 'PLA',           1000, 165, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', '~156-175'),
    ('Kingroon', 'PLA cardboard', 1000, 155, 1.75, 'cardboard', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('Geeetech', 'PLA',  1000, 186, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', '~178-195'),
    ('Eryone', 'PLA',           1000, 227, 1.75, 'plastic',   'https://www.printables.com/model/464663-empty-spool-weight-catalog', '~187-267'),
    ('Eryone', 'PLA cardboard', 1000, 170, 1.75, 'cardboard', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),

    # ============ ZAYNE3D / RIESERVO / 3DXTECH (engineering) ============
    ('3DXTech', 'CarbonX PA-CF', 750, 295, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
    ('3DXTech', 'EcoMax PLA',    1000, 264, 1.75, 'plastic', 'https://www.printables.com/model/464663-empty-spool-weight-catalog', ''),
]

# ---------- 3. Build records ----------
def derive_density(material):
    mat = material.upper()
    for key, d in DENSITY.items():
        if key.upper() in mat or mat in key.upper():
            return d
    return 1.24  # PLA default

# Material families: collapses 159 unique strings into 10 buckets for filtering.
# Order matters — first match wins. Engineering and composite checked first.
FAMILY_RULES = [
    # Composites with carbon/glass fiber
    ('Composite', ['CF', 'GF', 'CARBON', 'GLASS', 'УГЛЕВОЛОКНО', 'СТЕКЛО', '-CF', '-GF', 'CARBEX',
                   'FORMAX', 'ULTRAX', 'GFF', 'CFF', 'PA-CF', 'PET-CF', 'PETG-CF']),
    # High-temp engineering
    ('Engineering', ['PEEK', 'PSU', 'PEI', 'ULTEM', 'PPS', 'POM', 'PMMA', 'PBT', 'TERMAX', 'TITAN',
                     'PA6-GF30', 'PA-GF', 'PA12 GF', 'PPO', 'PPE', 'PA6', 'PA-6', 'PA11', 'PA-11', 'PA12', 'PA-12']),
    # Specific common materials
    ('Nylon', ['NYLON', 'НЕЙЛОН', 'PA ', 'PA-', 'POLYAMIDE']),
    ('PVA', ['PVA', 'ПВА', 'BVOH']),
    ('Support', ['SUPPORT', 'BREAKAWAY']),
    ('TPU', ['TPU', 'TPE', 'FLEX', 'RUBBER', 'SOFT', 'NINJAFLEX', 'EASYFLEX']),
    ('PC', ['PC ', 'PC/', '/PC', 'POLYCARBONATE', 'PC MAX', 'POLYCARB', 'PC PREMIUM', 'PC-']),
    ('ASA', ['ASA', 'ETERNAL']),
    ('HIPS', ['HIPS']),
    ('PETG', ['PETG', 'PET-G', 'PET G', 'RELAX', 'PETGUN', 'PET-GUN', 'PET ', 'PET.', 'XT', 'CPE', 'WATSON']),
    ('ABS', ['ABS']),
    ('PLA', ['PLA', 'ПЛА']),
    ('Other', ['SBS', 'SAN', 'PP', 'WAX', 'ВОСК', 'COAX', 'COMPOSITE', 'POK', 'STONE',
               'TERYLENE', 'PROTOTYPER', 'ULTRAN', 'CAST', 'FRICTION']),
]

def derive_family(material):
    """Map a raw material string to a family label."""
    mat = material.upper()
    for family, keys in FAMILY_RULES:
        for k in keys:
            if k in mat:
                return family
    return 'Other'

def build_record(manuf, material, net, spool, dia, spool_type, source_url, note):
    density = derive_density(material)
    defaults = SPOOL_DEFAULTS.get(spool_type, SPOOL_DEFAULTS['plastic'])
    country = COUNTRY.get(manuf, '—')
    rec = {
        'id': slug(manuf, material.replace(' ', '_'), str(net)),
        'name': f'{manuf} {material} {net}г',
        'manufacturer': manuf,
        'material': material,
        'materialFamily': derive_family(material),
        'netWeight': net,
        'diameter': dia,
        'spoolWeight': spool,
        'grossWeight': (net + spool) if spool else None,
        'spoolType': spool_type,
        'spoolDiameter': defaults['spoolDiameter'],
        'spoolWidth': defaults['spoolWidth'],
        'spoolInnerDiameter': defaults['spoolInnerDiameter'],
        'density': density,
        'country': country,
        'links': marketplace_links(manuf, material, country),
        'sourceUrl': source_url,
        'notes': note or ''
    }
    return rec

def load_russian_overrides():
    """Load curated Russian dataset and expand into individual records."""
    p = Path(__file__).parent.parent / 'data' / 'russian_brands.json'
    if not p.exists():
        return []
    raw = json.loads(p.read_text(encoding='utf-8'))
    sources = raw.get('_meta', {}).get('sources', {})
    out = []
    for brand in raw['filaments']:
        m = brand['manufacturer']
        for ln in brand['lines']:
            src_key = ln.get('src', '')
            src_full = sources.get(src_key, '')
            src_url = src_full.split(' — ')[0] if src_full else ''
            mat = ln['material']
            net = ln['netWeight']
            sp  = ln['spoolWeight']
            confidence = ln.get('confidence', 'community')
            # ESTIMATED → no real data, blank the spool weight so UI shows "помоги взвесить"
            if confidence == 'estimated':
                sp = None
            spool_type = 'cardboard' if 'эко' in mat.lower() or 'cardboard' in mat.lower() else 'plastic'
            defaults = SPOOL_DEFAULTS[spool_type]
            country = COUNTRY.get(m, 'RU')
            rec = {
                'id': slug(m, mat.replace(' ', '_'), str(net)),
                'name': f'{m} {mat} {net}г',
                'manufacturer': m,
                'material': mat,
                'materialFamily': derive_family(mat),
                'netWeight': net,
                'diameter': 1.75,
                'spoolWeight': sp,
                'grossWeight': (net + sp) if sp else None,
                'spoolType': spool_type,
                'spoolDiameter': defaults['spoolDiameter'],
                'spoolWidth': defaults['spoolWidth'],
                'spoolInnerDiameter': defaults['spoolInnerDiameter'],
                'density': derive_density(mat),
                'country': country,
                'links': marketplace_links(m, mat, country),
                'sourceUrl': src_url,
                'notes': ln.get('note', '')
            }
            out.append(rec)
    return out

def main():
    out = []
    seen_ids = set()

    # 1) Curated Russian brands (overrides) — preferred
    ru_overrides = load_russian_overrides()
    ru_manufacturers = {r['manufacturer'] for r in ru_overrides}
    for rec in ru_overrides:
        if rec['id'] not in seen_ids:
            out.append(rec)
            seen_ids.add(rec['id'])

    # 2) Existing Russian dataset (for brands NOT covered by overrides)
    # Brand-name aliases: ref dataset uses "PRINT PRODUCT" / "CYBERFIBER" — overrides use canonical forms.
    BRAND_ALIASES = {
        'PRINT PRODUCT': 'PrintProduct',
        'CYBERFIBER': 'CYBERFIBER',
        'SEM': 'SEM3D',  # объединяем со SEM3D из overrides
    }
    for f in load_existing():
        f['manufacturer'] = BRAND_ALIASES.get(f['manufacturer'], f['manufacturer'])
        if f['manufacturer'] in ru_manufacturers:
            continue
        t = f['type']
        country = COUNTRY.get(f['manufacturer'], '—')
        # Merge ref links + marketplace search links (ref links take precedence per-key)
        links = marketplace_links(f['manufacturer'], t, country)
        for l in f.get('links', []):
            links[l['type']] = l['url']
        rec = {
            'id': f['id'],
            'name': f['name'],
            'manufacturer': f['manufacturer'],
            'material': t,
            'materialFamily': derive_family(t),
            'netWeight': f['weight'],
            'diameter': f['diameter'],
            'spoolWeight': f['spoolWeight'],
            'grossWeight': f['weight'] + f['spoolWeight'],
            'spoolType': 'plastic',
            'spoolDiameter': f.get('spoolDiameter', 200),
            'spoolWidth': f.get('spoolWidth', 65),
            'spoolInnerDiameter': f.get('spoolInnerDiameter', 53),
            'density': derive_density(t),
            'country': country,
            'links': links,
            'sourceUrl': 'https://github.com/lDOCI/lDOCI.github.io/blob/main/filaments_data/filaments.json',
            'notes': f.get('notes', '') or ''
        }
        if rec['id'] not in seen_ids:
            out.append(rec)
            seen_ids.add(rec['id'])

    # 3) International dataset
    for row in NEW_DATA:
        rec = build_record(*row)
        base_id = rec['id']
        n = 2
        while rec['id'] in seen_ids:
            rec['id'] = f'{base_id}_{n}'
            n += 1
        seen_ids.add(rec['id'])
        out.append(rec)

    # Write
    data_dir = Path(__file__).parent.parent / 'data'
    data_dir.mkdir(exist_ok=True)
    (data_dir / 'filaments.json').write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8'
    )

    # Build manufacturers + materials indices
    mans = {}
    for r in out:
        m = r['manufacturer']
        if m not in mans:
            mans[m] = {'name': m, 'country': r['country'], 'count': 0}
        mans[m]['count'] += 1
    (data_dir / 'manufacturers.json').write_text(
        json.dumps(sorted(mans.values(), key=lambda x: -x['count']), ensure_ascii=False, indent=2),
        encoding='utf-8'
    )

    mats = {}
    for r in out:
        m = r['material']
        if m not in mats:
            mats[m] = {'name': m, 'density': r['density'], 'count': 0}
        mats[m]['count'] += 1
    (data_dir / 'materials.json').write_text(
        json.dumps(sorted(mats.values(), key=lambda x: -x['count']), ensure_ascii=False, indent=2),
        encoding='utf-8'
    )

    print(f'Wrote {len(out)} filaments, {len(mans)} manufacturers, {len(mats)} materials')
    print(f'  By country:')
    from collections import Counter
    for c, n in Counter(r['country'] for r in out).most_common():
        print(f'    {c}: {n}')

if __name__ == '__main__':
    main()
