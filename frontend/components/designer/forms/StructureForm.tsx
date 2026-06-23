"use client";

import React from "react";
import { useBlueprintStore } from "../../../store/useBlueprintStore";
import { Trash2, Plus, ListTodo } from "lucide-react";

export default function StructureForm() {
  const { blueprint, updateField } = useBlueprintStore();

  const handleRemoveItem = (path: string, index: number) => {
    const currentArray = path.split(".").reduce((o, i) => o?.[i], blueprint as any) || [];
    const nextArray = [...currentArray];
    nextArray.splice(index, 1);
    updateField(path, nextArray);
  };

  return (
    <div className="form-section">
      <div className="form-group row-group">
        <div className="form-group">
          <label className="form-label">Interview Type</label>
          <select
            className="form-select"
            value={blueprint.interview_structure?.type ?? ""}
            onChange={(e) => updateField("interview_structure.type", e.target.value)}
          >
            <option value="structured">Structured</option>
            <option value="semi_structured">Semi-Structured</option>
            <option value="adaptive">Adaptive</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Total Duration (Minutes)</label>
          <input
            type="number"
            className="form-input"
            value={blueprint.interview_structure?.total_duration_minutes ?? 0}
            onChange={(e) => updateField("interview_structure.total_duration_minutes", Number(e.target.value))}
          />
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--glass-border)", margin: "10px 0" }}></div>

      <label className="form-label">Interview Sections</label>
      <div className="card-list">
        {(blueprint.interview_structure?.sections || []).map((sec, idx) => (
          <div key={idx} className="editor-card">
            <button type="button" className="icon-btn card-close-btn" onClick={() => handleRemoveItem("interview_structure.sections", idx)}>
              <Trash2 size={12} />
            </button>
            <div className="form-group">
              <label className="form-label">Section Name</label>
              <input
                type="text"
                className="form-input"
                value={sec.name}
                onChange={(e) => {
                  const next = [...(blueprint.interview_structure?.sections || [])];
                  next[idx] = { ...next[idx], name: e.target.value };
                  updateField("interview_structure.sections", next);
                }}
              />
            </div>
            <div className="form-group row-group">
              <div className="form-group">
                <label className="form-label">Duration (Minutes)</label>
                <input
                  type="number"
                  className="form-input"
                  value={sec.duration_minutes}
                  onChange={(e) => {
                    const next = [...(blueprint.interview_structure?.sections || [])];
                    next[idx] = { ...next[idx], duration_minutes: Number(e.target.value) };
                    updateField("interview_structure.sections", next);
                  }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Focus Competencies</label>
                <input
                  type="text"
                  placeholder="Comma-separated competencies"
                  className="form-input"
                  value={(sec.focus_competencies || []).join(", ")}
                  onChange={(e) => {
                    const next = [...(blueprint.interview_structure?.sections || [])];
                    next[idx] = { 
                      ...next[idx], 
                      focus_competencies: e.target.value.split(",").map(c => c.trim()).filter(Boolean) 
                    };
                    updateField("interview_structure.sections", next);
                  }}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Objective</label>
              <textarea
                className="form-textarea"
                style={{ minHeight: "50px" }}
                value={sec.objective}
                onChange={(e) => {
                  const next = [...(blueprint.interview_structure?.sections || [])];
                  next[idx] = { ...next[idx], objective: e.target.value };
                  updateField("interview_structure.sections", next);
                }}
              />
            </div>
          </div>
        ))}

        {(blueprint.interview_structure?.sections || []).length === 0 && (
          <div className="empty-state">
            <ListTodo size={24} />
            <p>No sections defined. Click Add Section to build a structured pipeline.</p>
          </div>
        )}

        <button
          type="button"
          className="btn-inline-add"
          onClick={() => {
            updateField("interview_structure.sections", [
              ...(blueprint.interview_structure?.sections || []),
              { name: "New Section", duration_minutes: 10, objective: "", focus_competencies: [] }
            ]);
          }}
        >
          <Plus size={12} /> Add New Section
        </button>
      </div>

      <div style={{ borderTop: "1px solid var(--glass-border)", margin: "10px 0" }}></div>

      <label className="form-label">Question Strategy</label>
      <div className="form-group row-group">
        <div className="form-group">
          <label className="form-label">Mode</label>
          <select
            className="form-select"
            value={blueprint.question_strategy?.mode ?? ""}
            onChange={(e) => updateField("question_strategy.mode", e.target.value)}
          >
            <option value="fixed">Fixed</option>
            <option value="bank">Bank</option>
            <option value="ai_generated">AI Generated</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Follow-up Depth Limit</label>
          <input
            type="number"
            className="form-input"
            value={blueprint.question_strategy?.follow_up_depth_limit ?? 0}
            onChange={(e) => updateField("question_strategy.follow_up_depth_limit", Number(e.target.value))}
          />
        </div>
      </div>

      <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "10px", marginTop: "10px" }}>
        <input
          type="checkbox"
          id="adaptive_enabled"
          checked={blueprint.question_strategy?.adaptive_enabled ?? false}
          onChange={(e) => updateField("question_strategy.adaptive_enabled", e.target.checked)}
          style={{ width: "16px", height: "16px", cursor: "pointer" }}
        />
        <label htmlFor="adaptive_enabled" className="form-label" style={{ cursor: "pointer" }}>
          Enable Adaptive Mode (adjusts difficulty based on answers)
        </label>
      </div>
    </div>
  );
}
