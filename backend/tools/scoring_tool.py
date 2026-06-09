from typing import List, Dict, Any

class ScoringTool:
    """
    Computes candidate performance scores across different evaluation dimensions
    based on individual question marks.
    """

    @staticmethod
    def calculate_question_score(evaluation_data: Dict[str, Any]) -> float:
        """
        Calculates the overall score for a single question based on sub-metrics.
        """
        technical = float(evaluation_data.get("technical_accuracy", 0.0))
        depth = float(evaluation_data.get("depth", 0.0))
        clarity = float(evaluation_data.get("clarity", 0.0))
        relevance = float(evaluation_data.get("relevance", 0.0))

        # Direct average or weighted average
        if technical == 0.0 and depth == 0.0 and clarity == 0.0 and relevance == 0.0:
            return float(evaluation_data.get("overall_score", 0.0))

        overall = (technical + depth + clarity + relevance) / 4.0
        return round(overall, 2)

    @staticmethod
    def calculate_overall_metrics(scores_history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculates the cumulative average of all dimensions across all questions.
        """
        if not scores_history:
            return {
                "overall_score": 0.0,
                "technical_accuracy": 0.0,
                "depth": 0.0,
                "clarity": 0.0,
                "relevance": 0.0
            }

        total_questions = len(scores_history)
        sum_overall = 0.0
        sum_tech = 0.0
        sum_depth = 0.0
        sum_clarity = 0.0
        sum_relevance = 0.0

        for s in scores_history:
            sum_overall += float(s.get("overall_score", 0.0))
            sum_tech += float(s.get("technical_accuracy", 0.0))
            sum_depth += float(s.get("depth", 0.0))
            sum_clarity += float(s.get("clarity", 0.0))
            sum_relevance += float(s.get("relevance", 0.0))

        return {
            "overall_score": round(sum_overall / total_questions, 2),
            "technical_accuracy": round(sum_tech / total_questions, 2),
            "depth": round(sum_depth / total_questions, 2),
            "clarity": round(sum_clarity / total_questions, 2),
            "relevance": round(sum_relevance / total_questions, 2)
        }
