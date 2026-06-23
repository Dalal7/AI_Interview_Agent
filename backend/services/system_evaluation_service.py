import os
import time
import re
import json
import math
from collections import Counter
from typing import List, Dict, Any, Optional
from contextvars import ContextVar
from sqlalchemy.orm import Session
from backend.database.eval_repository import SystemEvaluationRepository

# Context variables to track metrics local to the active HTTP request thread
_metrics_context: ContextVar[Optional[Dict[str, Any]]] = ContextVar("metrics_context", default=None)

# Pricing rates for gemini-3.1-flash-lite
COST_PER_MILLION_INPUT = 0.075
COST_PER_MILLION_OUTPUT = 0.30

def compute_cosine_similarity(text1: str, text2: str) -> float:
    """Pure-python cosine similarity of two text blocks using term frequency."""
    words1 = re.findall(r'\w+', text1.lower())
    words2 = re.findall(r'\w+', text2.lower())
    
    if not words1 or not words2:
        return 0.0
        
    vec1 = Counter(words1)
    vec2 = Counter(words2)
    
    intersection = set(vec1.keys()) & set(vec2.keys())
    numerator = sum(vec1[x] * vec2[x] for x in intersection)
    
    sum1 = sum(vec1[x]**2 for x in vec1.keys())
    sum2 = sum(vec2[x]**2 for x in vec2.keys())
    denominator = math.sqrt(sum1) * math.sqrt(sum2)
    
    if not denominator:
        return 0.0
    return float(numerator) / denominator

class SystemEvaluationService:
    """
    Independent System Quality Observability Service.
    Logs cost, latency, accuracy, stability, and security metrics.
    """
    
    @staticmethod
    def init_transaction(candidate_id: str, agent: str, interview_id: str = None):
        """Initializes a request-level context dictionary to accumulate metrics."""
        _metrics_context.set({
            "start_time": time.time(),
            "candidate_id": candidate_id,
            "interview_id": interview_id or candidate_id,
            "agent": agent,
            "model": "gemini-3.1-flash-lite",
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
            "estimated_cost": 0.0,
            
            # Latency splits
            "retrieval_ms": 0,
            "llm_ms": 0,
            "evaluation_ms": 0,
            "total_ms": 0,
            
            # Accuracy checks
            "accuracy_rubric_retrieval": True,
            "accuracy_correct_bootcamp": True,
            "accuracy_valid_json": True,
            "accuracy_schema_valid": True,
            "accuracy_score": 1.0,
            
            # Stability defaults
            "stability_score_variance": 0.0,
            "stability_retrieval_overlap": 1.0,
            "stability_response_similarity": 1.0,
            "stability_score": 1.0,
            
            # Security checks
            "security_prompt_injection_detected": False,
            "security_jailbreak_detected": False,
            "security_unsafe_content_detected": False,
            "security_score": 1.0
        })

    @staticmethod
    def record_llm_call(model: str, duration_ms: int, response: Any = None, error: Any = None):
        """Records metadata, latency, tokens, and errors from an intercepted LLM call."""
        ctx = _metrics_context.get()
        if not ctx:
            return
            
        ctx["model"] = model
        
        # Latency tracking
        if os.getenv("EVAL_METRIC_LATENCY", "true").lower() == "true":
            ctx["llm_ms"] += duration_ms

        # Cost tracking
        if os.getenv("EVAL_METRIC_COST", "true").lower() == "true" and response and hasattr(response, "usage_metadata") and response.usage_metadata:
            u = response.usage_metadata
            ctx["prompt_tokens"] += getattr(u, "prompt_token_count", 0)
            ctx["completion_tokens"] += getattr(u, "response_token_count", 0)
            ctx["total_tokens"] += getattr(u, "total_token_count", 0)
            
            # Estimated cost
            input_cost = (ctx["prompt_tokens"] * COST_PER_MILLION_INPUT) / 1_000_000
            output_cost = (ctx["completion_tokens"] * COST_PER_MILLION_OUTPUT) / 1_000_000
            ctx["estimated_cost"] = float(input_cost + output_cost)

        # Accuracy checks (Schema validation check on JSON outputs)
        if os.getenv("EVAL_METRIC_ACCURACY", "true").lower() == "true":
            if error:
                ctx["accuracy_valid_json"] = False
                ctx["accuracy_schema_valid"] = False
            elif response and hasattr(response, "text"):
                try:
                    text_content = response.text.strip()
                    json.loads(text_content)
                except Exception:
                    # If it was supposed to be json but isn't valid, flag it
                    if response.text and ("{" in response.text or "[" in response.text):
                        ctx["accuracy_valid_json"] = False

    @staticmethod
    def record_rag_retrieval(duration_ms: int):
        """Records elapsed time for RAG csv search queries."""
        ctx = _metrics_context.get()
        if ctx and os.getenv("EVAL_METRIC_LATENCY", "true").lower() == "true":
            ctx["retrieval_ms"] += duration_ms

    @staticmethod
    def record_evaluation_time(duration_ms: int):
        """Records time spent by EvaluationAgent grading turns."""
        ctx = _metrics_context.get()
        if ctx and os.getenv("EVAL_METRIC_LATENCY", "true").lower() == "true":
            ctx["evaluation_ms"] += duration_ms

    @staticmethod
    def perform_security_check(message: str):
        """Performs local regex checking for malicious prompt injection/jailbreak content."""
        ctx = _metrics_context.get()
        if not ctx or os.getenv("EVAL_METRIC_SECURITY", "true").lower() != "true" or not message:
            return

        # Prompt Injection heuristics
        injection_keywords = [
            r"ignore previous instructions", 
            r"system prompt", 
            r"reveal your instructions",
            r"disregard all instructions",
            r"override your system",
            r"system rules"
        ]
        
        # Jailbreak attempts
        jailbreak_keywords = [
            r"dan mode",
            r"jailbreak",
            r"do anything now",
            r"you are now a hacker",
            r"ignore rubrics",
            r"ignore evaluation"
        ]
        
        # Harmful content indicators
        unsafe_keywords = [
            r"hack", r"bypass", r"execute command", r"exploit"
        ]

        # 1. Prompt Injection
        for pattern in injection_keywords:
            if re.search(pattern, message, re.IGNORECASE):
                ctx["security_prompt_injection_detected"] = True
                break

        # 2. Jailbreak
        for pattern in jailbreak_keywords:
            if re.search(pattern, message, re.IGNORECASE):
                ctx["security_jailbreak_detected"] = True
                break
                
        # 3. Unsafe / Harmful instructions
        for pattern in unsafe_keywords:
            if re.search(pattern, message, re.IGNORECASE):
                ctx["security_unsafe_content_detected"] = True
                break

        # Calculate security score (stability metrics reduce security score)
        violations = sum([
            1 if ctx["security_prompt_injection_detected"] else 0,
            1 if ctx["security_jailbreak_detected"] else 0,
            1 if ctx["security_unsafe_content_detected"] else 0
        ])
        ctx["security_score"] = float(1.0 - (violations * 0.33))

    @staticmethod
    def perform_accuracy_check(rubric_found: bool, correct_bootcamp: bool):
        """Checks rubric alignment and computes overall step accuracy score."""
        ctx = _metrics_context.get()
        if not ctx or os.getenv("EVAL_METRIC_ACCURACY", "true").lower() != "true":
            return
            
        ctx["accuracy_rubric_retrieval"] = bool(rubric_found)
        ctx["accuracy_correct_bootcamp"] = bool(correct_bootcamp)
        
        # Aggregate score
        metrics = [
            1 if ctx["accuracy_rubric_retrieval"] else 0,
            1 if ctx["accuracy_correct_bootcamp"] else 0,
            1 if ctx["accuracy_valid_json"] else 0,
            1 if ctx["accuracy_schema_valid"] else 0
        ]
        ctx["accuracy_score"] = float(sum(metrics) / len(metrics))

    @staticmethod
    def finalize_transaction(db: Session) -> Optional[Any]:
        """Calculates session totals and persists the log in PostgreSQL/SQLite."""
        ctx = _metrics_context.get()
        if not ctx:
            return None
            
        # Overall duration
        ctx["total_ms"] = int((time.time() - ctx["start_time"]) * 1000)
        
        # Calculate running cost total for the session
        past_cost = SystemEvaluationRepository.get_session_cost(db, ctx["candidate_id"])
        ctx["session_cost"] = float(past_cost + ctx["estimated_cost"])
        
        # Clean up transient fields
        log_data = ctx.copy()
        log_data.pop("start_time", None)
        
        # Persist log
        try:
            db_log = SystemEvaluationRepository.save_log(db, log_data)
            return db_log
        except Exception as e:
            print(f"Error persisting system quality log: {e}")
            return None
        finally:
            _metrics_context.set(None)

    @staticmethod
    def monkey_patch_gemini_calls():
        """Monkey patches the Google GenAI Models.generate_content calls to collect stats."""
        from google.genai import models
        
        if hasattr(models.Models, "_patched_by_eval"):
            return
            
        original_gen = models.Models.generate_content
        
        def patched_gen(self, model, contents, config=None, **kwargs):
            start = time.time()
            response = None
            error = None
            try:
                response = original_gen(self, model=model, contents=contents, config=config, **kwargs)
                return response
            except Exception as e:
                error = e
                raise e
            finally:
                duration_ms = int((time.time() - start) * 1000)
                # Feed information directly into the active request context var
                SystemEvaluationService.record_llm_call(
                    model=model,
                    duration_ms=duration_ms,
                    response=response,
                    error=error
                )
                
        models.Models.generate_content = patched_gen
        models.Models._patched_by_eval = True
        print("Google GenAI generate_content successfully patched for system quality logging.")
