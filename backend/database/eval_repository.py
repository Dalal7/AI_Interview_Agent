import datetime
from sqlalchemy import func, desc
from sqlalchemy.orm import Session
from backend.database.eval_models import SystemEvaluationLog

class SystemEvaluationRepository:
    """
    Handles saving and querying system evaluation logs.
    Supports dialect-specific queries for SQLite and PostgreSQL.
    """
    @staticmethod
    def save_log(db: Session, log_data: dict) -> SystemEvaluationLog:
        db_log = SystemEvaluationLog(**log_data)
        db.add(db_log)
        db.commit()
        db.refresh(db_log)
        return db_log

    @staticmethod
    def get_session_cost(db: Session, candidate_id: str) -> float:
        result = db.query(func.sum(SystemEvaluationLog.estimated_cost)).filter(
            SystemEvaluationLog.candidate_id == candidate_id
        ).scalar()
        return float(result) if result else 0.0

    @staticmethod
    def get_dashboard_stats(db: Session) -> dict:
        total_logs = db.query(SystemEvaluationLog).count()
        if total_logs == 0:
            return {
                "total_runs": 0,
                "avg_latency_ms": 0,
                "avg_rag_ms": 0,
                "avg_llm_ms": 0,
                "avg_tokens": 0,
                "avg_cost_per_session": 0.0,
                "json_failures": 0,
                "security_incidents": 0,
                "error_rate": 0.0,
                "most_expensive_sessions": [],
                "agent_metrics": {},
                "accuracy_trend": [],
                "stability_trend": []
            }

        # Averages
        avg_metrics = db.query(
            func.avg(SystemEvaluationLog.total_ms),
            func.avg(SystemEvaluationLog.retrieval_ms),
            func.avg(SystemEvaluationLog.llm_ms),
            func.avg(SystemEvaluationLog.total_tokens),
            func.avg(SystemEvaluationLog.estimated_cost)
        ).first()

        avg_latency_ms = int(avg_metrics[0]) if avg_metrics[0] else 0
        avg_rag_ms = int(avg_metrics[1]) if avg_metrics[1] else 0
        avg_llm_ms = int(avg_metrics[2]) if avg_metrics[2] else 0
        avg_tokens = int(avg_metrics[3]) if avg_metrics[3] else 0

        # JSON parsing failures
        json_failures = db.query(SystemEvaluationLog).filter(
            SystemEvaluationLog.accuracy_valid_json == False
        ).count()

        # Security incidents
        security_incidents = db.query(SystemEvaluationLog).filter(
            (SystemEvaluationLog.security_prompt_injection_detected == True) |
            (SystemEvaluationLog.security_jailbreak_detected == True) |
            (SystemEvaluationLog.security_unsafe_content_detected == True)
        ).count()

        # Error rate
        error_rate = float(json_failures / total_logs) if total_logs > 0 else 0.0

        # Most expensive sessions
        expensive_sessions = db.query(
            SystemEvaluationLog.candidate_id,
            func.max(SystemEvaluationLog.session_cost).label("session_cost")
        ).group_by(SystemEvaluationLog.candidate_id).order_by(desc("session_cost")).limit(5).all()

        most_expensive = [
            {"candidate_id": row[0], "total_cost": float(row[1])}
            for row in expensive_sessions if row[0]
        ]

        # Average cost per interview session
        session_costs = db.query(
            func.sum(SystemEvaluationLog.estimated_cost)
        ).group_by(SystemEvaluationLog.candidate_id).all()
        avg_cost_per_session = float(sum(row[0] for row in session_costs) / len(session_costs)) if session_costs else 0.0

        # Metrics by agent
        agent_stats = db.query(
            SystemEvaluationLog.agent,
            func.avg(SystemEvaluationLog.accuracy_score),
            func.avg(SystemEvaluationLog.total_ms),
            func.count(SystemEvaluationLog.id)
        ).group_by(SystemEvaluationLog.agent).all()

        agent_metrics = {
            row[0]: {
                "avg_accuracy": float(row[1]) if row[1] else 0.0,
                "avg_latency_ms": int(row[2]) if row[2] else 0,
                "total_runs": int(row[3])
            }
            for row in agent_stats if row[0]
        }

        # Daily trends
        dialect = db.bind.dialect.name
        if dialect == "sqlite":
            date_func = func.strftime("%Y-%m-%d", SystemEvaluationLog.timestamp)
        else:
            date_func = func.to_char(SystemEvaluationLog.timestamp, "YYYY-MM-DD")

        trend_stats = db.query(
            date_func.label("date"),
            func.avg(SystemEvaluationLog.accuracy_score),
            func.avg(SystemEvaluationLog.stability_score),
            func.avg(SystemEvaluationLog.total_ms)
        ).group_by(date_func).order_by(date_func).limit(7).all()

        accuracy_trend = []
        stability_trend = []
        for row in trend_stats:
            accuracy_trend.append({"date": row[0], "value": float(row[1]) if row[1] else 0.0})
            stability_trend.append({"date": row[0], "value": float(row[2]) if row[2] else 0.0})

        return {
            "total_runs": total_logs,
            "avg_latency_ms": avg_latency_ms,
            "avg_rag_ms": avg_rag_ms,
            "avg_llm_ms": avg_llm_ms,
            "avg_tokens": avg_tokens,
            "avg_cost_per_session": avg_cost_per_session,
            "json_failures": json_failures,
            "security_incidents": security_incidents,
            "error_rate": error_rate,
            "most_expensive_sessions": most_expensive,
            "agent_metrics": agent_metrics,
            "accuracy_trend": accuracy_trend,
            "stability_trend": stability_trend
        }
