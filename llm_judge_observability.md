# 📊 LLM-as-a-Judge System Quality Observability (LLMOps)

This document details the implementation of the real-time **LLM-as-a-Judge Quality Observability** telemetry integrated into the Autonomous Interview Agent platform.

---

## 🎯 The Metrics
We introduced five core LLMOps evaluation metrics to monitor system quality and detect failures (e.g. hallucinations, irrelevant generations, or broken code answers) on every agent interaction:

| Metric | Range | Description | How It is Evaluated |
| :--- | :--- | :--- | :--- |
| **Answer Relevancy (R)** | `0.0` - `1.0` | Measures how directly the candidate's response addresses the interviewer's question. | Evaluated by Gemini based on question-to-answer semantic alignment. |
| **Faithfulness (F)** | `0.0` - `1.0` | Measures how factually grounded the candidate's answer is in the retrieved RAG context. | Evaluated by Gemini by cross-referencing candidate claims with the retrieved RAG rubric rules. |
| **Hallucination Score (H)** | `0.0` - `1.0` | Measures the presence of fabricated concepts, false technical facts, or fake libraries. | Evaluated by Gemini; looks for non-existent syntax or incorrect programmatic definitions. |
| **Hallucination Resistance** | `0.0` - `1.0` | Measures the model's robustness against hallucinating. | Calculated programmatically: `1.0 - Hallucination Score`. |
| **Functional Score (Fn)** | `0.0` - `1.0` | Measures the syntactic viability and logical correctness of any code snippets or logic. | Evaluated by Gemini; checks logic and code syntax correctness. |

---

## ⚡ Latency & Cost Optimization: Single-Pass Evaluation
Standard LLMOps tools (like Ragas or TruLens) trigger separate, expensive LLM calls for every metric, which introduces **1-3 seconds of latency** and **increases token consumption**.

To make it production-ready and fast, we merged candidate evaluation and judge quality calculations into a **single, unified prompt call** inside [evaluation_agent.py](file:///c:/Users/User/Desktop/Agentic%20AI/Demos/AI_Interview_Agent_v6.0/6.1/AI_Interview_Agent_v6.1/Agent/backend/agents/evaluation_agent.py):
1. The **interviewer grading schema** (`EvaluationResultSchema`) was expanded to request the four core judge metrics as floats.
2. The Gemini system prompt instructs the model to return these metrics in the structured JSON payload.
3. The values are extracted in a single operation, mapped, and committed to the thread's quality observability transaction.

---

## 🛠️ Codebase Modifications Map

### 1. Database Schema
*   **File**: [eval_models.py](file:///c:/Users/User/Desktop/Agentic%20AI/Demos/AI_Interview_Agent_v6.0/6.1/AI_Interview_Agent_v6.1/Agent/backend/database/eval_models.py)
*   **Change**: Added SQLAlchemy columns (`llm_judge_answer_relevancy`, `llm_judge_faithfulness`, etc.) to the `SystemEvaluationLog` model.
*   **Sync Logic** ([session.py](file:///c:/Users/User/Desktop/Agentic%20AI/Demos/AI_Interview_Agent_v6.0/6.1/AI_Interview_Agent_v6.1/Agent/backend/database/session.py)): Added code to automatically drop and rebuild the logs table on startup to ensure sqlite database schema compatibility.

### 2. Analytics & API Mappings
*   **File**: [system_evaluation_service.py](file:///c:/Users/User/Desktop/Agentic%20AI/Demos/AI_Interview_Agent_v6.0/6.1/AI_Interview_Agent_v6.1/Agent/backend/services/system_evaluation_service.py)
*   **Change**: Configured `init_transaction()` to initialize these metrics in the request thread-local context.
*   **File**: [eval_repository.py](file:///c:/Users/User/Desktop/Agentic%20AI/Demos/AI_Interview_Agent_v6.0/6.1/AI_Interview_Agent_v6.1/Agent/backend/database/eval_repository.py)
*   **Change**: Updated `get_dashboard_stats()` to query the averages of these columns from SQL and calculate aggregate dashboard metrics.
*   **File**: [evaluation_routes.py](file:///c:/Users/User/Desktop/Agentic%20AI/Demos/AI_Interview_Agent_v6.0/6.1/AI_Interview_Agent_v6.1/Agent/backend/api/evaluation_routes.py)
*   **Change**: Updated the `/logs` serialization route to include an `"llm_judge"` JSON block in responses.

### 3. Frontend Observatory UI
*   **File**: [system-eval.tsx](file:///c:/Users/User/Desktop/Agentic%20AI/Demos/AI_Interview_Agent_v6.0/6.1/AI_Interview_Agent_v6.1/Agent/frontend/pages/system-eval.tsx)
*   **Change**: Added types for the new metrics inside `DashboardStats` and `LogEntry`. Added a card grid row showing overall averages and added a dedicated `LLM Judge (R | F | H | Fn)` quality column to the recent logs list.

---

## 🧪 Verification Results

### 1. Database Operations Check
*   Verified schema synchronization and table creation on startup.
*   Ran check scripts to write mock quality telemetry and query statistics aggregates:
    ```bash
    Log saved successfully, ID: 1
    Stats retrieved successfully: { ..., 'avg_llm_judge_answer_relevancy': 0.9, 'avg_llm_judge_faithfulness': 0.8, ... }
    ```

### 2. Frontend Compilation Check
*   Ran TypeScript compiler checks to ensure types are consistent:
    ```bash
    npx tsc --noEmit
    ```
    *Result*: Compiled **successfully** with **0 compiler errors**.

### 3. Backend Unit Test Suite
*   Ran the complete FastAPI & LangGraph pytest suite:
    ```bash
    python -m pytest backend/tests/
    ```
    *Result*: **17/17 tests passed successfully** (100% success rate).
