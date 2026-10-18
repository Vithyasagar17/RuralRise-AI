# Data dictionary: `backend/data/opportunities.json`

The file is a JSON array. Each item is one opportunity (training, apprenticeship or scholarship). IDs must be unique; the backend rejects duplicates.

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Unique ID, format `<name>-<number>` (for example `ddu-gky-001`). Never reuse or change an ID after release. |
| `title` | string | Short name shown in the UI. Do not make claims the official source does not make (for example "free"). |
| `category` | string | One of `training`, `apprenticeship`, `scholarship`. The `/opportunities` filter ignores letter case. |
| `description` | string | Plain-language summary for students. Say when details vary by year or place and point to the official page. |
| `education_levels` | list of strings | Education levels the opportunity is open to, such as `Class 10`, `Class 12`. **An empty list means eligibility by class is not recorded.** It is not treated as "open to everyone", so these records do not appear in searches filtered by education level. |
| `locations` | list of strings | Places where it is available (currently `Tamil Nadu`). |
| `eligibility_requirements` | list of strings | One requirement per line: age, school type, residence, documents. |
| `deadline` | string or `null` | Application deadline. `null` means none has been verified. Many schemes run on a yearly cycle, so do not guess. |
| `official_url` | string | Official page where students apply or read the rules. |
| `source_name` | string | The body or page the facts came from. Name only sources actually read. |
| `last_verified` | string or `null` | Date the facts were last checked against the source. `null` means not verified. |

## Filtering behaviour (`GET /opportunities`)

- `category`, `education_level` and `location` compare without regard to letter case.
- `search` must not be empty (an empty value returns 422).
- A record with an empty `education_levels` list is excluded when `education_level` is given.

## Records and status

| ID | Category | Class tags | Verified |
|---|---|---|---|
| `tn-iti-001` | training | Class 10, Class 12 | No (`null`) |
| `ddu-gky-001` | training | none | Yes |
| `rseti-001` | training | none | Yes |
| `naps2-001` | apprenticeship | Class 10, Class 12 | Yes |
| `pudhumai-penn-001` | scholarship | Class 10, Class 12 | Yes |
| `tamil-pudhalvan-001` | scholarship | Class 12 | No (`null`) |

## Open items

- NAPS-2: upper age limit and exact education requirement are not recorded.
- DDU-GKY: the age range (18 to 35) comes from the Tamil Nadu page; the central scheme may differ.
- DDU-GKY and RSETI: no class tags yet, so they do not appear in Class 10 or Class 12 searches.
- TN ITI and Tamil Pudhalvan: no verified date; some claims come from secondary sources.
- Tamil Pudhalvan: check whether `Class 10` should be added (ITI and diploma courses can start after Class 10).
- Record whether the checks were done on the official pages or through a secondary tool.
