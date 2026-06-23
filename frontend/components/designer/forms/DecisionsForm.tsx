"use client";

import React from "react";
import { useBlueprintStore } from "../../../store/useBlueprintStore";

export default function DecisionsForm() {
  const { blueprint, updateField } = useBlueprintStore();

  return (
    <div className="form-section">
      <div className="form-group row-group">
        <div className="form-group">
          <label className="form-label">Auto-Accept Threshold</label>
          <input
            type="number"
            className="form-input"
            value={blueprint.decision_rules?.auto_accept_threshold ?? 0}
            onChange={(e) => updateField("decision_rules.auto_accept_threshold", Number(e.target.value))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Auto-Reject Threshold</label>
          <input
            type="number"
            className="form-input"
            value={blueprint.decision_rules?.auto_reject_threshold ?? 0}
            onChange={(e) => updateField("decision_rules.auto_reject_threshold", Number(e.target.value))}
          />
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--glass-border)", margin: "10px 0" }}></div>

      <label className="form-label">Human Review Range</label>
      <div className="form-group row-group">
        <div className="form-group">
          <label className="form-label">Review Minimum Bound</label>
          <input
            type="number"
            className="form-input"
            value={blueprint.decision_rules?.human_review_range?.min ?? 0}
            onChange={(e) => updateField("decision_rules.human_review_range.min", Number(e.target.value))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Review Maximum Bound</label>
          <input
            type="number"
            className="form-input"
            value={blueprint.decision_rules?.human_review_range?.max ?? 0}
            onChange={(e) => updateField("decision_rules.human_review_range.max", Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
