# Prototype practice content

`backend/data/practice_courses.json` contains 30 original introductory worksheets authored for this integration. Titles, IDs, practice tasks and self-check criteria follow the supplied `career_learning_modules.json`; they are not third-party courses, provider listings or qualifications. Each course uses the existing six-field `/courses` model. `module_id` and `course_id` are identical.

The original two demo lessons and the supplied career/roadmap catalogs were preserved. Member 4 and the relevant educational/domain reviewers must approve accuracy, age suitability and local relevance before any real training deployment. Marking completion is a learner's own record, not a graded assessment, verified skill or certificate. No payments, enrollment promises, medical treatment or live electrical practice are part of these worksheets.

Electrical activities use diagrams, fictional observations and safe reporting; they do not instruct installation or repair. Healthcare activities concern fictional non-clinical communication and records, without diagnosis/treatment. Business examples use fictional arithmetic, without investment or profit advice. Code samples are local introductory exercises and should be reviewed in a supervised learning setting.

Voice controls are optional browser enhancements. Reference implementation behavior was checked against MDN's current SpeechSynthesis and SpeechRecognition API documentation on 19 October 2026:

- https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/speak
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/cancel
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition

Read-aloud speaks the English lesson text as English; it does not translate it. Voice availability/offline behavior depends on installed voices and browser services. Recognition may process audio through a browser service and is started only by an explicit microphone button. A transcript is editable and is never automatically saved to the backend.
