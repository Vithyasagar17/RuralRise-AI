// Public interface of the facilitator feature. Import from here, not from inner files.
export { default as FacilitatorDashboard } from './FacilitatorDashboard.jsx';
export { default as StudentList } from './StudentList.jsx';
export { default as StudentProgressCard } from './StudentProgressCard.jsx';
export { default as StudentDetails } from './StudentDetails.jsx';
export { default as OpportunityShareList } from './OpportunityShareList.jsx';
export { loadFacilitatorData, fetchFacilitatorStudents, fetchRecommendations, toRecommendationRequest } from './facilitatorApi.js';
export { summarizeProgress, groupSummary, suggestNextSteps } from './facilitatorUtils.js';
export * as facilitatorMockData from './facilitatorMockData.js';
