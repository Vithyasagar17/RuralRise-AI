# Roadmap HTTP/course integration — proposal for Members 1/2/3/4

Status: discussion only; **no public route, schema, migration or course ID change has been enabled**.

Member 2 supplies generate_learning_roadmap(profile, career, courses=None), which returns ordered module descriptions, tasks, skills, criteria, weekly scheduling, estimates, warnings and next steps. The public API has no roadmap endpoint. More importantly, its thirty module IDs are separate from the two lesson/course IDs currently accepted by progress storage. Adding a route alone would not make the learning journey complete.

## Decisions needed

1. **HTTP contract:** agree the route/method, body, response and authorization. A possible route is POST /roadmap with `{profile: StudentProfile, career_id: string}`. This name/body is a proposal only. Preserve the existing recommendations response rather than inserting roadmap objects into it.
2. **Profile identity:** decide whether the authenticated backend should load the student's owned profile or accept an explicit full profile for exploration. A teacher generating a student's plan must follow the agreed assignment rules. Do not expose arbitrary saved profiles by ID.
3. **One trackable course catalog:** Member 4 supplies real lessons conforming to the existing six-field Course model and agrees stable IDs with Member 2. Map each roadmap module to one or more existing course IDs through a reviewed mapping, or agree that module/course IDs become identical. Do not rename existing IDs without a progress migration plan.
4. **Content completeness:** roadmap modules currently have descriptions/tasks/criteria, not the strict lesson records used by OfflineLessons. Member 4 must author/verify the actual lesson text and difficulty/skill fields. Member 3 must not invent accredited content or course-source claims to fill these gaps.
5. **Estimates versus actual tracking:** preserve weekly plans as planning guidance. Define how partial modules, one module split across weeks and multiple courses per module contribute to progress; avoid double-counting completion.
6. **Failure/UI states:** agree unknown career, invalid catalog and missing mapping responses, and the UI for an unavailable roadmap. Preserve warnings/eligibility caveats in a reviewed response instead of silently reporting a complete plan with broken lesson links.

## Backend work after agreement

Add reviewed Pydantic request/response models and a route with existing authentication dependencies. Load the configured career/module catalogs explicitly; do not assume the engine's default data directory is the deployment's configured catalog. Validate ID uniqueness, references, finite positive estimates and bounded scheduling before exposing the generator. Preserve the seven current API contracts and add targeted regression tests for the new route rather than modifying an existing response independently.

Test the full path with Members 1/4/5: profile -> recommendation -> chosen career -> roadmap -> real linked lesson -> offline completion -> sync -> assigned facilitator view. Until that contract/data mapping is agreed, the internal generator is available for review/demo, but no claim is made that roadmap modules can be completed through the current progress API.
