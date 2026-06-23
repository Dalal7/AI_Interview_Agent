"use client";

import React from "react";
import { useBlueprintStore } from "../../../store/useBlueprintStore";

export default function ProgramForm() {
  const { blueprint, updateField } = useBlueprintStore();

  return (
    <div className="form-section">
      <div className="form-group">
        <label className="form-label">Program Name</label>
        <input
          type="text"
          className="form-input"
          value={blueprint.program?.name ?? ""}
          onChange={(e) => updateField("program.name", e.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="form-label">Program Description</label>
        <textarea
          className="form-textarea"
          value={blueprint.program?.description ?? ""}
          onChange={(e) => updateField("program.description", e.target.value)}
        />
      </div>
      <div className="form-group row-group">
        <div className="form-group">
          <label className="form-label">Program Type</label>
          <input
            type="text"
            className="form-input"
            value={blueprint.program?.type ?? ""}
            onChange={(e) => updateField("program.type", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Duration (Weeks)</label>
          <input
            type="number"
            className="form-input"
            value={blueprint.program?.duration_weeks ?? 0}
            onChange={(e) => updateField("program.duration_weeks", Number(e.target.value))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Cohort Size</label>
          <input
            type="number"
            className="form-input"
            value={blueprint.program?.cohort_size ?? 0}
            onChange={(e) => updateField("program.cohort_size", Number(e.target.value))}
          />
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--glass-border)", margin: "10px 0" }}></div>

      <div className="form-group">
        <label className="form-label">Interview Purpose</label>
        <textarea
          className="form-textarea"
          value={blueprint.interview_objective?.purpose ?? ""}
          onChange={(e) => updateField("interview_objective.purpose", e.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="form-label">Success Definition</label>
        <textarea
          className="form-textarea"
          value={blueprint.interview_objective?.success_definition ?? ""}
          onChange={(e) => updateField("interview_objective.success_definition", e.target.value)}
        />
      </div>
    </div>
  );
}
