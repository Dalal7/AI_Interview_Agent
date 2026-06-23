"use client";

import React from "react";
import { useBlueprintStore } from "../../../store/useBlueprintStore";
import { Trash2, Plus, Sliders } from "lucide-react";

export default function CompetenciesForm() {
  const { blueprint, updateField } = useBlueprintStore();

  const handleRemoveItem = (path: string, index: number) => {
    const currentArray = path.split(".").reduce((o, i) => o?.[i], blueprint as any) || [];
    const nextArray = [...currentArray];
    nextArray.splice(index, 1);
    updateField(path, nextArray);
  };

  return (
    <div className="form-section">
      <div className="card-list">
        {(blueprint.competencies || []).map((comp, idx) => (
          <div key={idx} className="editor-card">
            <button type="button" className="icon-btn card-close-btn" onClick={() => handleRemoveItem("competencies", idx)}>
              <Trash2 size={12} />
            </button>
            <div className="form-group">
              <label className="form-label">Competency Name</label>
              <input
                type="text"
                className="form-input"
                value={comp.name}
                onChange={(e) => {
                  const next = [...(blueprint.competencies || [])];
                  next[idx] = { ...next[idx], name: e.target.value };
                  updateField("competencies", next);
                }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Weight (%)</label>
              <input
                type="number"
                className="form-input"
                value={comp.weight}
                onChange={(e) => {
                  const next = [...(blueprint.competencies || [])];
                  next[idx] = { ...next[idx], weight: Number(e.target.value) };
                  updateField("competencies", next);
                }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                style={{ minHeight: "50px" }}
                value={comp.description}
                onChange={(e) => {
                  const next = [...(blueprint.competencies || [])];
                  next[idx] = { ...next[idx], description: e.target.value };
                  updateField("competencies", next);
                }}
              />
            </div>
          </div>
        ))}
        
        {(blueprint.competencies || []).length === 0 && (
          <div className="empty-state">
            <Sliders size={24} />
            <p>No competencies defined yet.</p>
          </div>
        )}

        <button
          type="button"
          className="btn-inline-add"
          onClick={() => {
            updateField("competencies", [
              ...(blueprint.competencies || []),
              { name: "New Competency", weight: 0, description: "" }
            ]);
          }}
        >
          <Plus size={12} /> Add New Competency
        </button>
      </div>
    </div>
  );
}
