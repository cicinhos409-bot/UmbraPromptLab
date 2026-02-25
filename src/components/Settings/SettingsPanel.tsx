import React, { useState } from 'react';
import type { AppSettings } from '../../types/prompt';
import './SettingsPanel.css';

interface SettingsPanelProps {
    settings: AppSettings;
    onUpdate: (updates: Partial<AppSettings>) => void;
}

const MODELS = [
    { id: 'mistral-large-latest', label: 'Mistral Large (Recomendado)', desc: 'Melhor qualidade, prompts mais elaborados' },
    { id: 'mistral-small-latest', label: 'Mistral Small (Rápido)', desc: 'Mais rápido, bom para testes' },
    { id: 'open-mistral-7b', label: 'Mistral 7B (Gratuito)', desc: 'Modelo open-source, qualidade reduzida' },
] as const;

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onUpdate }) => {
    const [showKey, setShowKey] = useState(false);
    const [saved, setSaved] = useState(false);
    const [localKey, setLocalKey] = useState(settings.apiKey);

    const handleSaveKey = () => {
        onUpdate({ apiKey: localKey.trim() });
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    return (
        <div className="settings-panel fade-in">
            <div className="panel-header-section">
                <h2 className="panel-heading font-title">⚙ Configurações</h2>
                <p className="panel-desc">Configure o Umbra Prompt Lab para seu ambiente.</p>
            </div>

            {/* API Key */}
            <div className="settings-section">
                <div className="grimoire-divider">API Mistral</div>
                <div className="settings-group">
                    <label className="form-label" htmlFor="api-key-input">
                        <span className="label-icon">🔑</span>
                        Mistral API Key
                    </label>
                    <p className="settings-hint">
                        Obtenha sua chave gratuita em{' '}
                        <a href="https://console.mistral.ai/" target="_blank" rel="noopener noreferrer" className="settings-link">
                            console.mistral.ai
                        </a>
                    </p>
                    <div className="api-key-row">
                        <div className="key-input-wrapper">
                            <input
                                id="api-key-input"
                                type={showKey ? 'text' : 'password'}
                                className="input-grimoire key-input"
                                value={localKey}
                                onChange={e => setLocalKey(e.target.value)}
                                placeholder="sk-..."
                                autoComplete="off"
                                spellCheck={false}
                            />
                            <button
                                type="button"
                                className="key-toggle"
                                onClick={() => setShowKey(v => !v)}
                                title={showKey ? 'Ocultar' : 'Mostrar'}
                            >
                                {showKey ? '👁' : '🙈'}
                            </button>
                        </div>
                        <button
                            type="button"
                            className={`btn-gold save-key-btn ${saved ? 'saved' : ''}`}
                            onClick={handleSaveKey}
                            id="save-api-key-btn"
                        >
                            {saved ? '✓ Salvo!' : 'Salvar'}
                        </button>
                    </div>
                    {settings.apiKey && (
                        <div className="key-status">
                            <span className="status-dot" style={{ background: '#4caf74', boxShadow: '0 0 6px rgba(76,175,116,0.6)' }} />
                            API Key configurada ✓
                        </div>
                    )}
                </div>
            </div>

            {/* Model */}
            <div className="settings-section">
                <div className="grimoire-divider">Modelo de IA</div>
                <div className="settings-group">
                    <label className="form-label">
                        <span className="label-icon">🧠</span>
                        Modelo Mistral
                    </label>
                    <div className="model-list">
                        {MODELS.map(m => (
                            <button
                                key={m.id}
                                type="button"
                                className={`model-card ${settings.model === m.id ? 'active' : ''}`}
                                onClick={() => onUpdate({ model: m.id })}
                                id={`model-${m.id}`}
                            >
                                <div className="model-radio">
                                    <div className="radio-dot" />
                                </div>
                                <div className="model-info">
                                    <span className="model-name">{m.label}</span>
                                    <span className="model-desc">{m.desc}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Preferences */}
            <div className="settings-section">
                <div className="grimoire-divider">Preferências</div>
                <div className="settings-group">
                    <label className="form-label">
                        <span className="label-icon">💾</span>
                        Auto-salvar no Histórico
                    </label>
                    <button
                        type="button"
                        className={`toggle-btn ${settings.autoSave ? 'on' : 'off'}`}
                        onClick={() => onUpdate({ autoSave: !settings.autoSave })}
                        id="autosave-toggle"
                        role="switch"
                        aria-checked={settings.autoSave}
                    >
                        <span className="toggle-track">
                            <span className="toggle-thumb" />
                        </span>
                        <span className="toggle-label">{settings.autoSave ? 'Ativado' : 'Desativado'}</span>
                    </button>
                </div>
            </div>

            {/* About */}
            <div className="settings-about">
                <div className="grimoire-divider">Sobre</div>
                <p className="about-text">
                    <strong className="text-gold">Umbra Prompt Lab</strong> — Estúdio de Anime<br />
                    v1.0.0 · Powered by Mistral AI · Grimoire Edition
                </p>
                <p className="about-text" style={{ marginTop: 8, opacity: 0.4 }}>
                    Criado para artistas e criadores de conteúdo anime.
                </p>
            </div>
        </div>
    );
};
