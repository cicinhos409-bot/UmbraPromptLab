import React from 'react';
import type { GeneratedPrompt } from '../../types/prompt';
import './HistoryPanel.css';

interface HistoryPanelProps {
    history: GeneratedPrompt[];
    onSelect: (prompt: GeneratedPrompt) => void;
    onDelete: (id: string) => void;
    onClearAll: () => void;
}

const STYLE_ICONS: Record<string, string> = {
    'anime': '⛩️', 'cyberpunk-anime': '🌆', 'fantasy-anime': '🐉',
    'shonen': '⚡', 'shoujo': '🌸', 'mecha': '🤖',
    'horror-anime': '🕯️', 'slice-of-life': '☕', 'historical-anime': '⚔️',
};

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
    history, onSelect, onDelete, onClearAll,
}) => {
    if (history.length === 0) {
        return (
            <div className="history-panel fade-in">
                <div className="panel-header-section">
                    <h2 className="panel-heading font-title">📜 Histórico</h2>
                </div>
                <div className="empty-state">
                    <div className="empty-icon">📜</div>
                    <div className="empty-title">Sem prompts salvos</div>
                    <div className="empty-sub">Gere seu primeiro prompt e clique em "Salvar".</div>
                </div>
            </div>
        );
    }

    return (
        <div className="history-panel fade-in">
            <div className="panel-header-section history-header">
                <h2 className="panel-heading font-title">📜 Histórico</h2>
                <button className="btn-ghost clear-btn" onClick={onClearAll} id="clear-history-btn">
                    ✕ Limpar Tudo
                </button>
            </div>
            <div className="history-list">
                {history.map((item, i) => (
                    <div
                        key={item.id}
                        className="history-item"
                        style={{ animationDelay: `${i * 40}ms` }}
                    >
                        <button
                            className="history-item-main"
                            onClick={() => onSelect(item)}
                            id={`history-item-${item.id}`}
                        >
                            <span className="history-icon">{STYLE_ICONS[item.style] || '✦'}</span>
                            <div className="history-info">
                                <span className="history-title">{item.title}</span>
                                <span className="history-meta">
                                    {item.style} · {item.mood} · {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                                </span>
                                <span className="history-preview">{item.quickPrompt?.substring(0, 60)}...</span>
                            </div>
                        </button>
                        <button
                            className="btn-icon history-delete"
                            onClick={() => onDelete(item.id)}
                            title="Remover"
                            aria-label="Remover prompt do histórico"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
