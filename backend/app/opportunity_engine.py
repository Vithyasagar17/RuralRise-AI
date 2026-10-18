"""TEMPORARY FILTER ADAPTER for Member 4; no eligibility decision is made.

Proposed Python integration interface, pending team review. Public JSON fields unchanged.
"""


def filter_opportunities(opportunities, *, category=None, education_level=None, location=None, search=None):
    def equal(left, right):
        return left.strip().casefold() == right.strip().casefold()

    matches = []
    for item in opportunities:
        if category and not equal(item["category"], category):
            continue
        # Empty lists mean unknown and must not be interpreted as universal eligibility.
        if education_level and not any(equal(x, education_level) for x in item["education_levels"]):
            continue
        if location and not any(equal(x, location) for x in item["locations"]):
            continue
        if search and search.strip().casefold() not in (item["title"] + " " + item["description"]).casefold():
            continue
        matches.append(item)
    return matches
