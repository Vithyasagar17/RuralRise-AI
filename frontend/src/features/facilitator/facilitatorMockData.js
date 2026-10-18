// FICTIONAL demo data for the facilitator dashboard.
//
// Every object here uses EXACTLY the JSON shapes returned by Member 3's backend
// (see docs/api-contracts.md), so swapping mock -> live data needs no mapping.
// No real people, programmes, URLs, deadlines or eligibility rules are included.
//
// Used when: (a) dataSource="mock" is passed to <FacilitatorDashboard/>, or
// (b) dataSource="auto" (default) and the backend cannot be reached.
//
// NOTE: demo-student-003..005 exist only here. The backend accepts progress
// only for demo-student-001/002 or IDs created through POST /profile.

/** Shape of GET /facilitator/students */
export const MOCK_FACILITATOR_RESPONSE = {
  students: [
    {
      student_id: 'demo-student-001',
      profile: {
        name: 'Demo Student',
        education_level: 'Class 12',
        location: 'Tamil Nadu',
        language: 'Tamil',
        interests: ['electronics', 'hands-on work'],
        skills: ['basic mathematics'],
        preferred_learning: 'practical',
        weekly_learning_hours: 5,
        goals: ['find vocational training'],
      },
      progress: [
        { student_id: 'demo-student-001', course_id: 'demo-safety', completed: true, score: 80, updated_at: '2026-10-15T09:30:00+00:00' },
      ],
    },
    {
      student_id: 'demo-student-002',
      profile: {
        name: 'Fictional Learner',
        education_level: 'Class 10',
        location: 'Tamil Nadu',
        language: 'Tamil',
        interests: ['agriculture'],
        skills: [],
        preferred_learning: 'practical',
        weekly_learning_hours: 3,
        goals: ['explore learning pathways'],
      },
      progress: [],
    },
    {
      student_id: 'demo-student-003',
      profile: {
        name: 'Demo Learner C',
        education_level: 'Class 12',
        location: 'Tamil Nadu',
        language: 'English',
        interests: ['handicrafts', 'small business'],
        skills: ['drawing'],
        preferred_learning: 'visual',
        weekly_learning_hours: 4,
        goals: ['start a small enterprise'],
      },
      progress: [
        { student_id: 'demo-student-003', course_id: 'demo-safety', completed: true, score: 92, updated_at: '2026-10-10T11:00:00+00:00' },
        { student_id: 'demo-student-003', course_id: 'demo-planning', completed: true, score: 75, updated_at: '2026-10-12T08:15:00+00:00' },
      ],
    },
    {
      student_id: 'demo-student-004',
      profile: {
        name: 'Demo Learner D',
        education_level: 'Class 10',
        location: 'Tamil Nadu',
        language: 'Tamil',
        interests: ['solar energy'],
        skills: [],
        preferred_learning: 'audio',
        weekly_learning_hours: 2,
        goals: ['learn a practical skill'],
      },
      progress: [
        { student_id: 'demo-student-004', course_id: 'demo-planning', completed: false, score: null, updated_at: '2026-09-20T10:00:00+00:00' },
      ],
    },
    {
      student_id: 'demo-student-005',
      profile: {
        name: 'Demo Learner E',
        education_level: 'Diploma',
        location: 'Tamil Nadu',
        language: 'Tamil',
        interests: ['electronics'],
        skills: ['basic mathematics', 'soldering basics'],
        preferred_learning: 'practical',
        weekly_learning_hours: 6,
        goals: ['find vocational training'],
      },
      progress: [
        { student_id: 'demo-student-005', course_id: 'demo-planning', completed: true, score: null, updated_at: '2026-10-16T14:45:00+00:00' },
      ],
    },
  ],
};

/** Shape of GET /courses (same two fictional fixtures as backend/data/courses.json). */
export const MOCK_COURSES = [
  {
    id: 'demo-safety',
    title: 'Demo: Recognising electrical hazards',
    skill: 'safety awareness',
    difficulty: 'beginner',
    lesson:
      'Fictional prototype lesson. Stay away from exposed wires and report hazards to a trained adult. Never touch or practise on live electrical equipment. This is not professional training.',
    practical_task: 'On paper, list three situations where you would ask a trained professional for help.',
  },
  {
    id: 'demo-planning',
    title: 'Demo: Plan a learning week',
    skill: 'learning planning',
    difficulty: 'beginner',
    lesson: 'Fictional prototype lesson. Choose one learning goal and divide your available time into short sessions.',
    practical_task: 'Write a simple schedule with two short learning sessions.',
  },
];

/** Shape of GET /opportunities (same fictional fixtures as backend/data/opportunities.json). */
export const MOCK_OPPORTUNITIES = [
  {
    id: 'demo-training-001',
    title: 'FICTIONAL DEMO: Practical learning programme',
    category: 'training',
    description: 'Mock record for API integration only. No real programme, provider, deadline or eligibility has been verified.',
    education_levels: ['Class 12'],
    locations: ['Tamil Nadu'],
    eligibility_requirements: [],
    deadline: null,
    official_url: '',
    source_name: 'Fictional backend fixture',
    last_verified: null,
  },
  {
    id: 'demo-scholarship-001',
    title: 'FICTIONAL DEMO: Learning support',
    category: 'scholarship',
    description: 'Mock search record. All eligibility information is unknown. Do not use to make application decisions.',
    education_levels: [],
    locations: [],
    eligibility_requirements: [],
    deadline: null,
    official_url: '',
    source_name: 'Fictional backend fixture',
    last_verified: null,
  },
];

/** Shape of POST /recommendations -> { careers: [...] } (mirrors the backend's temporary mock). */
export const MOCK_RECOMMENDATIONS = {
  careers: [
    {
      career_id: 'solar-technician',
      title: 'Solar PV Technician',
      match_score: 0,
      reasons: ['Temporary mock; real career matching is not integrated.'],
      missing_skills: [],
      next_steps: ['Ask a facilitator to review suitable learning options.'],
    },
    {
      career_id: 'agriculture-assistant',
      title: 'Agriculture Assistant',
      match_score: 0,
      reasons: ['Temporary mock; real career matching is not integrated.'],
      missing_skills: [],
      next_steps: ['Ask a facilitator to review suitable learning options.'],
    },
  ],
};
