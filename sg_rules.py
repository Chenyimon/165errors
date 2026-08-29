"""Singapore recycling knowledge base.

VERIFIED 29 Aug 2026 against:
  - NEA National Recycling Programme
    nea.gov.sg/our-services/waste-management/3r-programmes-and-resources/national-recycling-programme
  - NEA EPR / e-waste system (ALBA named as current PRS operator)
    nea.gov.sg/our-services/waste-management/3r-programmes-and-resources/e-waste-management
  - Clean & Green Singapore, "Know Your Contaminants"
    cgs.gov.sg/recycleright/know-your-contaminants
  - recycle.gov.sg item checker

If a judge disputes something, recycle.gov.sg has a per-item search - it is the
authority, and this file is a cached subset of it.
"""

# The national commingled blue bin takes paper, plastic, glass and metal -
# provided they are empty and clean. NEA's line is a "CLEAN diet".
BLUE_BIN_MATERIALS = {
    "paper": "Paper and cardboard - flatten boxes. Must be clean and dry.",
    "cardboard": "Paper and cardboard - flatten boxes. Must be clean and dry.",
    "plastic": "Plastic bottles, containers and cups - empty, rinse and dry first.",
    "metal": "Metal cans and tins - empty and rinse first.",
    "glass": "Glass bottles and jars - empty and rinse first.",
}

# Not accepted in the blue bin, and where each should actually go.
SPECIAL_STREAMS = {
    "battery": {
        "where": "ALBA e-waste bin (the 3-in-1 bin)",
        "detail": "Household batteries are regulated e-waste - AA, AAA, AAAA, C, D, "
                  "9V and button cells. The 3-in-1 bin takes batteries, ICT equipment "
                  "and lamps. Over 870 collection points at malls, supermarkets, "
                  "community centres and HDB void decks; find one via the ALBA site "
                  "or the myENV app. Seal any leaking battery in a bag first.",
        "why": "Batteries can ignite in collection trucks and at sorting facilities.",
    },
    "ewaste": {
        "where": "ALBA e-waste bin",
        "detail": "Regulated e-waste covers ICT equipment, lamps, batteries, large "
                  "appliances and solar panels - phones, laptops, chargers, light "
                  "bulbs. Large appliances can be booked for collection through ALBA. "
                  "All community centres are due to have e-waste bins by June 2026.",
        "why": "E-waste holds heavy metals, and the materials inside are worth recovering.",
    },
    "textile": {
        "where": "Donate it, or general waste",
        "detail": "NEA's guidance is to donate clothing, shoes and toys that are still "
                  "in good condition. They are not accepted in the blue bin. Textile "
                  "collection bins (such as Cloop) exist at some malls, but donating "
                  "is the official first choice.",
        "why": "Textiles tangle in sorting machinery and contaminate other recyclables.",
    },
    "food_waste": {
        "where": "General waste chute",
        "detail": "Household food waste is not collected for recycling in Singapore.",
        "why": "Food is the single biggest contaminant - it ruins the paper it travels with.",
    },
    "styrofoam": {
        "where": "General waste chute",
        "detail": "Styrofoam boxes, food containers, cooler boxes and packing peanuts - "
                  "clean or dirty, none of it is recyclable here.",
        "why": "It breaks into fragments that contaminate the whole load.",
    },
    "tissue": {
        "where": "General waste chute",
        "detail": "Tissue paper, paper towels, napkins and wet wipes - clean or dirty, "
                  "none can be recycled.",
        "why": "The fibres are too short and too soiled to be reprocessed.",
    },
    "ceramic": {
        "where": "General waste chute",
        "detail": "Ceramics, porcelain, mirrors and drinking glasses are not the same "
                  "as bottle glass and are not accepted in the blue bin.",
        "why": "Different melting point from bottle glass - it ruins the batch.",
    },
    "other": {
        "where": "General waste chute",
        "detail": "This does not belong in the blue bin.",
        "why": "Non-recyclables in the blue bin contaminate everything around them.",
    },
}

# NEA estimates ~40% of what goes into blue bins cannot be recycled because of
# contamination. This is the real problem in Singapore - not sorting, but rinsing.
CONTAMINATION_ADVICE = (
    "Empty it out and give it a quick rinse first - around 40% of what goes into "
    "Singapore's blue bins is spoiled by leftover food and drink."
)


def check_blue_bin(material: str, item_name: str, contaminated: bool) -> str:
    """Check whether an item belongs in Singapore's national blue recycling bin.

    Args:
        material: One of paper, cardboard, plastic, metal, glass, ewaste,
            battery, textile, food_waste, styrofoam, tissue, ceramic, other.
        item_name: Plain-English name of the item, e.g. "aluminium drinks can".
        contaminated: True if the item still holds liquid or food residue.
    """
    material = material.lower().strip()

    if material in BLUE_BIN_MATERIALS:
        answer = f"YES - {item_name} goes in the blue bin. {BLUE_BIN_MATERIALS[material]}"
        if contaminated:
            answer += f" IMPORTANT: this one looks unrinsed. {CONTAMINATION_ADVICE}"
        return answer

    stream = SPECIAL_STREAMS.get(material, SPECIAL_STREAMS["other"])
    return (
        f"NO - {item_name} must not go in the blue bin. "
        f"Take it to: {stream['where']}. {stream['detail']} Reason: {stream['why']}"
    )


def find_disposal_point(category: str) -> str:
    """Find where in Singapore to dispose of something the blue bin will not take.

    Args:
        category: One of battery, ewaste, textile, food_waste, styrofoam,
            tissue, ceramic, other.
    """
    stream = SPECIAL_STREAMS.get(category.lower().strip(), SPECIAL_STREAMS["other"])
    return f"{stream['where']} - {stream['detail']}"
