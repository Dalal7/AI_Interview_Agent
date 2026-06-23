"use client";

import React from "react";
import { useBlueprintStore } from "../../../store/useBlueprintStore";
import { Trash2, Plus, BarChart3 } from "lucide-react";

export default function RubricForm() {
  const { blueprint, updateField } = useBlueprintStore();

  const handleRemoveItem = (path: string, index: number) => {
    const currentArray = path.split(".").reduce((o, i) => o?.[i], blueprint as any) || [];
    const nextArray = [...currentArray];
    nextArray.splice(index, 1);
    updateField(path, nextArray);
  };

  return (
    <div className="form-section">
      <label className="form-label">Evaluation Criteria Rubric</label>
      <div className="card-list">
        {(blueprint.evaluation_rubric?.criteria || []).map((crit, idx) => (
          <div key={idx} className="editor-card">
            <button type="button" className="icon-btn card-close-btn" onClick={() => handleRemoveItem("evaluation_rubric.criteria", idx)}>
              <Trash2 size={12} />
            </button>
            <div className="form-group">
              <label className="form-label">Criteria Name</label>
              <input
                type="text"
                className="form-input"
                value={crit.name}
                onChange={(e) => {
                  const next = [...(blueprint.evaluation_rubric?.criteria || [])];
                  next[idx] = { ...next[idx], name: e.target.value };
                  updateField("evaluation_rubric.criteria", next);
                }}
              />
            </div>
            <div className="form-group row-group">
              <div className="form-group">
                <label className="form-label">Weight (%)</label>
                <input
                  type="number"
                  className="form-input"
                  value={crit.weight}
                  onChange={(e) => {
                    const next = [...(blueprint.evaluation_rubric?.criteria || [])];
                    next[idx] = { ...next[idx], weight: Number(e.target.value) };
                    updateField("evaluation_rubric.criteria", next);
                  }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Scoring Scale</label>
                <select
                  className="form-select"
                  value={crit.scale}
                  onChange={(e) => {
                    const next = [...(blueprint.evaluation_rubric?.criteria || [])];
                    next[idx] = { ...next[idx], scale: e.target.value as any };
                    updateField("evaluation_rubric.criteria", next);
                  }}
                >
                  <option value="0-5">0-5 (Standard)</option>
                  <option value="0-10">0-10 (Extended)</option>
                  <option value="0-100">0-100 (Percentage)</option>
                </select>
              </div>
            </div>
          </div>
        ))}

        {(blueprint.evaluation_rubric?.criteria || []).length === 0 && (
          <div className="empty-state">
            <BarChart3 size={24} />
            <p>No evaluation criteria defined yet.</p>
          </div>
        )}

        <button
          type="button"
          className="btn-inline-add"
          onClick={() => {
            updateField("evaluation_rubric.criteria", [
              ...(blueprint.evaluation_rubric?.criteria || []),
              { name: "New Criteria", weight: 0, scale: "0-5" }
            ]);
          }}
        >
          <Plus size={12} /> Add Criteria Row
        </button>
      </div>
    </div>
  );
}
