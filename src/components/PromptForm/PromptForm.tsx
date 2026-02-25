import React, { useState } from 'react';
import { STYLES, MOODS, CHARACTER_TYPES } from '../../constants';
import type { PromptRequest, StyleOption, MoodOption } from '../../types/prompt';
import './PromptForm.css';

interface PromptFormProps {
    onGenerate: (request: PromptRequest) => void;
    isLoading: boolean;
    hasApiKey: boolean;
    initialIdea?: string;
    initialStyle?: StyleOption;
    initialMood?: MoodOption;
}

export const PromptForm: React.FC<PromptFormProps> = ({
    onGenerate,
    isLoading,
    hasApiKey,
    initialIdea = '',
    initialStyle = 'anime',
    initialMood = 'epic',
}) => {
    const [idea, setIdea] = useState(initialIdea);
    const [style, setStyle] = useState<StyleOption>(initialStyle);
    const [mood, setMood] = useState<MoodOption>(initialMood);
    const [characterType, setCharacterType] = useState<string>('Protagonista feminina');

    React.useEffect(() => {
        if (initialIdea) setIdea(initialIdea);
        setStyle(initialStyle);
        setMood(initialMood);
    }, [initialIdea, initialStyle, initialMood]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!idea.trim() || isLoading || !hasApiKey) return;
        onGenerate({ idea: idea.trim(), style, mood, characterType });
    };

    const ideaLength = idea.length;
    const maxLength = 500;

    return (
        <form className="prompt-form fade-in" onSubmit={handleSubmit}>
            {/* Idea Input */}
            <div className="form-section">
                <label className="form-label" htmlFor="idea-input">
                    <span className="label-icon">✦</span>
                    Sua Ideia
                </label>
                <div className="textarea-wrapper">
                    <textarea
                        id="idea-input"
                        className="input-grimoire idea-textarea"
                        placeholder="Descreva sua ideia... Ex: 'Uma garota mágica sozinha sob a chuva numa cidade neon'"
                        value={idea}
                        onChange={e => setIdea(e.target.value)}
                        maxLength={maxLength}
                        rows={4}
                        disabled={isLoading}
                    />
                    <span className={`char-count ${ideaLength > maxLength * 0.9 ? 'warning' : ''}`}>
                        {ideaLength}/{maxLength}
                    </span>
                </div>
            </div>

            {/* Style Selector */}
            <div className="form-section">
                <label className="form-label">
                    <span className="label-icon">🎨</span>
                    Estilo Artístico
                </label>
                <div className="style-grid">
                    {STYLES.map(s => (
                        <button
                            key={s.id}
                            type="button"
                            className={`style-card ${style === s.id ? 'active' : ''}`}
                            onClick={() => setStyle(s.id)}
                            disabled={isLoading}
                            title={s.description}
                        >
                            <span className="style-icon">{s.icon}</span>
                            <span className="style-label">{s.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Mood Selector */}
            <div className="form-section">
                <label className="form-label">
                    <span className="label-icon">🌙</span>
                    Atmosfera / Mood
                </label>
                <div className="mood-grid">
                    {MOODS.map(m => (
                        <button
                            key={m.id}
                            type="button"
                            className={`mood-chip ${mood === m.id ? 'active' : ''}`}
                            onClick={() => setMood(m.id)}
                            disabled={isLoading}
                            style={{ '--mood-color': m.color } as React.CSSProperties}
                        >
                            <span>{m.icon}</span>
                            <span>{m.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Character Type */}
            <div className="form-section">
                <label className="form-label" htmlFor="char-type">
                    <span className="label-icon">👤</span>
                    Tipo de Personagem
                </label>
                <select
                    id="char-type"
                    className="input-grimoire select-grimoire"
                    value={characterType}
                    onChange={e => setCharacterType(e.target.value)}
                    disabled={isLoading}
                >
                    {CHARACTER_TYPES.map(ct => (
                        <option key={ct} value={ct}>{ct}</option>
                    ))}
                </select>
            </div>

            {/* Submit */}
            <div className="form-submit">
                {!hasApiKey && (
                    <p className="api-warning">
                        ⚠️ Configure sua API Key nas <strong>Configurações</strong> para gerar prompts.
                    </p>
                )}
                <button
                    type="submit"
                    className="btn-gold generate-btn"
                    disabled={!idea.trim() || isLoading || !hasApiKey}
                    id="generate-btn"
                >
                    {isLoading ? (
                        <>
                            <span className="rune-spinner" />
                            Invocando...
                        </>
                    ) : (
                        <>
                            <span className="btn-rune">✦</span>
                            Gerar Prompt
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};
