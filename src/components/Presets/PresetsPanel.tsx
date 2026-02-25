import React from 'react';
import { PRESETS } from '../../constants';
import type { PresetIdea } from '../../types/prompt';
import './PresetsPanel.css';

interface PresetsPanelProps {
    onSelectPreset: (preset: PresetIdea) => void;
}

export const PresetsPanel: React.FC<PresetsPanelProps> = ({ onSelectPreset }) => {
    return (
        <div className="presets-panel fade-in">
            <div className="panel-header-section">
                <h2 className="panel-heading font-title">⚡ Presets Rápidos</h2>
                <p className="panel-desc">Clique em um preset para preencher o gerador automaticamente.</p>
            </div>
            <div className="presets-grid">
                {PRESETS.map((preset, i) => (
                    <button
                        key={preset.id}
                        className="preset-card"
                        onClick={() => onSelectPreset(preset)}
                        id={`preset-${preset.id}`}
                        style={{ animationDelay: `${i * 60}ms` }}
                    >
                        <div className="preset-icon">{preset.icon}</div>
                        <div className="preset-info">
                            <span className="preset-title">{preset.title}</span>
                            <span className="preset-idea">{preset.idea.substring(0, 80)}...</span>
                            <div className="preset-tags">
                                {preset.tags.map(t => (
                                    <span key={t} className="tag" style={{ fontSize: '9px', padding: '2px 7px' }}>{t}</span>
                                ))}
                            </div>
                        </div>
                        <div className="preset-arrow">→</div>
                    </button>
                ))}
            </div>
        </div>
    );
};
