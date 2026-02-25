import React from 'react';
import type { User } from '@supabase/supabase-js';
import type { AppView } from '../../types/prompt';
import './Sidebar.css';

interface SidebarProps {
    activeView: AppView;
    onViewChange: (view: AppView) => void;
    hasApiKey: boolean;
    historyCount: number;
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onSignOut: () => void;
}

type ItemStatus = 'done' | 'active' | 'locked';

interface StageItem {
    id: AppView | null;   // null = not yet built (locked)
    label: string;
    status: ItemStatus;
}

interface Stage {
    number: number;
    label: string;
    stageStatus: 'done' | 'active' | 'locked';
    items: StageItem[];
}

/* ── Free top items ─────────────────────────────── */
const FREE_ITEMS: { id: AppView; label: string; icon: string }[] = [
    { id: 'inicio', label: 'Início', icon: '🏠' },
    { id: 'perfil', label: 'Perfil', icon: '👤' },
];

/* ── Roadmap stages ─────────────────────────────── */
const STAGES: Stage[] = [
    {
        number: 1,
        label: 'FUNDAÇÃO',
        stageStatus: 'done',
        items: [
            { id: 'umbracreator', label: 'Umbra Creator', status: 'active' },
            { id: 'onomancer', label: 'Umbra Onomancer', status: 'done' },
            { id: 'grimorio', label: 'Umbra Personagens', status: 'done' },
            { id: 'sinopses', label: 'Umbra das Sinopses', status: 'done' },
            { id: 'isekai', label: 'Umbra Planejador de Anime', status: 'done' },
            { id: 'umbravoz', label: 'Umbra Voz', status: 'active' },

        ],
    },
    {
        number: 2,
        label: 'CENAS',
        stageStatus: 'locked',
        items: [
            { id: null, label: 'Umbra Cenas', status: 'locked' },
            { id: null, label: 'Umbra Prompts Cenas', status: 'locked' },
            { id: null, label: 'Umbra Cenas Estende', status: 'locked' },
            { id: null, label: 'Umbra Cenas Locais', status: 'locked' },
        ],
    },
    {
        number: 3,
        label: 'PROMPTS',
        stageStatus: 'locked',
        items: [
            { id: null, label: 'Umbra Prompts Início', status: 'locked' },
            { id: null, label: 'Umbra Prompts Vidy', status: 'locked' },
            { id: null, label: 'Umbra Prompts Loop', status: 'locked' },
        ],
    },
];

const PROGRESS = 40;

const STAGE_BADGE: Record<string, string> = {
    done: '✅',
    active: '🔶',
    locked: '⬜',
};

const ITEM_ICON: Record<ItemStatus, string> = {
    done: '✓',
    active: '→',
    locked: '🔒',
};

/* ── Component ──────────────────────────────────── */
export const Sidebar: React.FC<SidebarProps> = ({
    activeView, onViewChange, hasApiKey, historyCount, isOpen, onClose, user, onSignOut,
}) => {
    return (
        <aside
            className={`sidebar ${isOpen ? 'sidebar--open' : 'sidebar--closed'}`}
            aria-hidden={!isOpen}
        >
            {/* Logo */}
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">
                    <span className="logo-rune">✦</span>
                </div>
                <div className="sidebar-logo-text">
                    <span className="sidebar-title font-title">UMBRA</span>
                    <span className="sidebar-subtitle">Prompt Lab</span>
                </div>
                <button className="sidebar-close-btn" onClick={onClose} aria-label="Fechar menu">✕</button>
            </div>

            <nav className="sidebar-nav">

                {/* ── Free top items ── */}
                <div className="sidebar-free">
                    {FREE_ITEMS.map(item => (
                        <button
                            key={item.id}
                            className={`sidebar-nav-item ${activeView === item.id ? 'active' : ''}`}
                            onClick={() => onViewChange(item.id)}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-label">{item.label}</span>
                        </button>
                    ))}
                </div>

                {/* ── Progress bar ── */}
                <div className="sdb-progress">
                    <div className="sdb-progress-header">
                        <span className="sdb-progress-pin">📍</span>
                        <span className="sdb-progress-title">SEU PROGRESSO</span>
                        <span className="sdb-progress-pct">{PROGRESS}%</span>
                    </div>
                    <div className="sdb-bar-track">
                        <div className="sdb-bar-fill" style={{ width: `${PROGRESS}%` }} />
                    </div>
                </div>

                {/* ── Stages ── */}
                {STAGES.map(stage => (
                    <div
                        key={stage.number}
                        className={`sidebar-stage sidebar-stage--${stage.stageStatus}`}
                    >
                        {/* Stage header */}
                        <div className="sidebar-stage-hdr">
                            <span className="stage-hdr-badge">{STAGE_BADGE[stage.stageStatus]}</span>
                            <span className="stage-hdr-text">
                                ETAPA {stage.number}: {stage.label}
                            </span>
                        </div>

                        {/* Stage items */}
                        {stage.items.map((item, i) => (
                            <button
                                key={i}
                                disabled={item.status === 'locked'}
                                className={[
                                    'sidebar-stage-item',
                                    `sidebar-stage-item--${item.status}`,
                                    item.id && activeView === item.id ? 'active' : '',
                                ].join(' ')}
                                onClick={() => item.id && onViewChange(item.id)}
                            >
                                <span className="stage-item-icon">{ITEM_ICON[item.status]}</span>
                                <span className="stage-item-label">{item.label}</span>
                            </button>
                        ))}
                    </div>
                ))}

            </nav>

            {/* Footer */}
            <div className="sidebar-footer">
                {/* User info */}
                {user && (
                    <div className="sidebar-user">
                        <div className="sidebar-user-avatar">
                            {(user.email?.[0] ?? '?').toUpperCase()}
                        </div>
                        <div className="sidebar-user-info">
                            <span className="sidebar-user-email">
                                {user.email && user.email.length > 22
                                    ? user.email.slice(0, 20) + '…'
                                    : user.email}
                            </span>
                            <button className="sidebar-signout-btn" onClick={onSignOut}>
                                ← Sair
                            </button>
                        </div>
                    </div>
                )}
                <div className={`api-status ${hasApiKey ? 'connected' : 'disconnected'}`}>
                    <span className="status-dot" />
                    <span className="status-label">
                        {hasApiKey ? 'API Conectada' : 'Sem API Key'}
                    </span>
                </div>
                {/* Quick access to Settings */}
                <button
                    className={`sidebar-settings-btn ${activeView === 'settings' ? 'active' : ''}`}
                    onClick={() => onViewChange('settings')}
                    title="Configurações"
                >
                    ⚙ Configurações
                </button>
                <div className="sidebar-version">v1.0 · Umbra Lab</div>
            </div>
        </aside>
    );
};
