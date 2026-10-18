# RuralRise AI: Career scoring algorithm

## Status and purpose

This is a transparent, deterministic starter algorithm for a prototype. It does not use a trained machine-learning model or an LLM. The score is a **rule-based profile-fit indicator**, not a probability of success, a prediction of employment, or a scientifically validated measure.

## Inputs

The engine reads these profile dimensions when present:

| Dimension | Weight | How it is calculated |
|---|---:|---|
| Interests | 45 points | Share of the student's listed interests that match the career's curated `interests` tags. |
| Existing skills | 30 points | Share of the student's listed skills that match the career's curated `relevant_skills` tags. |
| Goals | 15 points | Share of listed student goals that match the career's `goal_tags`. |
| Learning preference | 10 points | Full 10 points when the student's stated `preferred_learning` matches a value in `learning_preferences`; otherwise 0. |

Each dimension contributes between zero and its maximum weight. Text comparisons are lowercase, punctuation-normalised phrase matches; this is not semantic understanding. Dataset tags therefore need consistent wording. When only one of the four matching-information dimensions is supplied, the raw score is multiplied by 0.75 and the result is marked `evidence_strength: "limited"`. Two dimensions indicate `moderate`; three or four indicate `strong`. These are descriptive labels, not calibrated confidence values.

Education prerequisites are handled separately. The engine only enforces a minimum when the dataset explicitly records `education_prerequisites.minimum_level` and sets `mandatory` to `true`. If the recorded minimum is not met, 15 points are deducted; if the student's level cannot be compared, 7.5 points are deducted. A career is not automatically hidden, because students should be able to explore pathways and learn what preparation is needed. The current starter dataset does not encode verified mandatory education minimums, so its status is normally `not_specified`.

## Output interpretation

- `match_score`: rounded integer from 0 through 100, based on the tags and weights above.
- `reasons`: matching profile values that contributed to the rank.
- `matched_interests` / `matched_skills`: profile values that matched curated tags.
- `missing_skills`: listed `required_skills` not found in the supplied profile's skills. If a student has not filled in skills, this means “not recorded in the profile,” not proof they lack the skills.
- `prerequisites`: recorded education prerequisites that should be checked; currently empty unless mandatory requirements are configured in the dataset.
- `prerequisite_note`: a reminder that formal requirements may need provider/employer verification.
- `warnings`: input quality and low-evidence warnings.

If there are no interests, skills, goals, or learning preferences, the engine returns an empty `careers` array and asks for more profile information instead of presenting arbitrary rankings. If profile signals exist but none matches the curated tags, it also avoids emitting a zero-score ranking.

## Why these weights?

Interests receive the largest weight because the prototype aims to help with career discovery, skills receive the next largest weight to show transferable starting points, goals add direction, and learning preference is a smaller planning signal. These weights are pragmatic design choices for a time-limited prototype, not results from research or user studies. They should be evaluated with representative students and revised with the team before production use.

## Learning roadmap scheduling

`generate_learning_roadmap` filters modules by `career_ids`, orders them by `sequence`, totals `estimated_hours`, and places those hours into consecutive weeks up to the student's `weekly_learning_hours`. A module may span weeks if it exceeds the available weekly hours. The course JSON is internal prototype content, not an external accredited course catalogue.
