"""Project Member 2's internal result onto the unchanged public API model."""
from .schemas import RecommendationResponse

PUBLIC_FIELDS = ('career_id', 'title', 'match_score', 'reasons', 'missing_skills', 'next_steps')


def public_recommendations(result):
    if isinstance(result, dict):
        if not isinstance(result.get('careers'), list) or not isinstance(result.get('score_note'), str):
            raise ValueError('Unsupported career engine envelope')
        records = result['careers']
    elif isinstance(result, list):
        # Preserve the original engine adapter boundary during team integration.
        records = result
    else:
        raise ValueError('Unsupported career engine result')
    projected = []
    for record in records:
        if not isinstance(record, dict) or any(field not in record for field in PUBLIC_FIELDS):
            raise ValueError('Invalid career engine record')
        projected.append({field: record[field] for field in PUBLIC_FIELDS})
    return RecommendationResponse.model_validate({'careers': projected})
