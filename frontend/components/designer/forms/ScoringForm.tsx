"use client";

import React from "react";
import { useBlueprintStore } from "../../../store/useBlueprintStore";

export default function ScoringForm() {
  const { blueprint, updateField } = useBlueprintStore();

  return (
    <div className="form-section">
      <div className="form-group row-group">
        <div className="form-group">
          <label className="form-label">Overall Scale</label>
          <input
            type="number"
            className="form-input"
            value={blueprint.scoring?.overall_scale ?? 0}
            onChange={(e) => updateField("scoring.overall_scale", Number(e.target.value))}
            placeholder="e.g. 100 or 10"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Pass Threshold Score</label>
          <input
            type="number"
            className="form-input"
            value={blueprint.scoring?.pass_threshold ?? 0}
            onChange={(e) => updateField("scoring.pass_threshold", Number(e.target.value))}
          />
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--glass-border)", margin: "10px 0" }}></div>
      
      <label className="form-label">Scoring Category Weight Multipliers</label>
      <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "8px" }}>
        Adjust weights for the final score compilation. Must sum to 100%.
      </p>

      <div className="form-group">
        <label className="form-label">Technical Competence Weight (%)</label>
        <input
          type="number"
          className="form-input"
          value={blueprint.scoring?.weights?.technical ?? 0}
          onChange={(e) => updateField("scoring.weights.technical", Number(e.target.value))}
        />
      </div>
      <div className="form-group">
        <label className="form-label">Communication Weight (%)</label>
        <input
          type="number"
          className="form-input"
          value={blueprint.scoring?.weights?.communication ?? 0}
          onChange={(e) => updateField("scoring.weights.communication", Number(e.target.value))}
        />
      </div>
      <div className="form-group">
        <label className="form-label">Problem Solving Weight (%)</label>
        <input
          type="number"
          className="form-input"
          value={blueprint.scoring?.weights?.problem_solving ?? 0}
          onChange={(e) => updateField("scoring.weights.problem_solving", Number(e.target.value))}
        />
      </div>
    </div>
  );
}
