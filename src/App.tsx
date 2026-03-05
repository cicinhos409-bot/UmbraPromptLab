import React, { useState, useCallback, useEffect } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { PromptForm } from './components/PromptForm/PromptForm';
import { PromptResult } from './components/PromptResult/PromptResult';
import { PresetsPanel } from './components/Presets/PresetsPanel';
import { HistoryPanel } from './components/History/HistoryPanel';
import { SettingsPanel } from './components/Settings/SettingsPanel';
import { GrimorioSinopses } from './components/GrimorioSinopses/GrimorioSinopses';
import { IsekaiPlanner } from './components/IsekaiPlanner/IsekaiPlanner';
import { VoiceForge } from './components/VoiceForge/VoiceForge';
import { UmbraOnomancer } from './components/UmbraOnomancer/UmbraOnomancer';
import { UmbraVoz } from './components/UmbraVoz/UmbraVoz';
import { UmbraCreator } from './components/UmbraCreator/UmbraCreator';
import { SinopsesAgent } from './components/SinopsesAgent/SinopsesAgent';
import { UmbraGallery } from './components/UmbraGallery/UmbraGallery';
import { AcademiaAnime } from './components/AcademiaAnime/AcademiaAnime';
import { UmbraCenas } from './components/UmbraCenas/UmbraCenas';
import { usePromptHistory } from './hooks/usePromptHistory';
import { useSettings } from './hooks/useSettings';
import { useAuth } from './hooks/useAuth';
import { supabase } from './lib/supabase';
import { generatePrompt } from './services/mistralService';
import type { AppView, GeneratedPrompt, PromptRequest, PresetIdea, StyleOption, MoodOption } from './types/prompt';
import './App.css';

const isMobile = () => window.innerWidth < 768;

export default function App() {
    const [activeView, setActiveView] = useState<AppView>('generator');
    const [isLoading, setIsLoading] = useState(false);
    const [currentPrompt, setCurrentPrompt] = useState<GeneratedPrompt | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
    const [userTier, setUserTier] = useState<'free' | 'pro' | 'turbo'>('free');

    // Sidebar open/close — start closed on mobile, open on desktop
    const [sidebarOpen, setSidebarOpen] = useState(!isMobile());

    // Preset auto-fill state
    const [presetIdea, setPresetIdea] = useState('');
    const [presetStyle, setPresetStyle] = useState<StyleOption>('anime');
    const [presetMood, setPresetMood] = useState<MoodOption>('epic');

    const { history, addPrompt, removePrompt, clearHistory } = usePromptHistory();
    const { settings, updateSettings } = useSettings();
    const { user, loading: authLoading, signOut } = useAuth();

    // Redirect ref — ensures we only redirect once
    const redirected = React.useRef(false);

    // Auth guard — redirect to landing if not authenticated
    useEffect(() => {
        if (!authLoading && !user && !redirected.current) {
            redirected.current = true;
            window.location.href = '/landing.html';
        }
    }, [user, authLoading]);

    // Fetch profile tier when user is available
    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        (async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('tier')
                .eq('id', user.id)
                .maybeSingle();

            if (!cancelled && !error && data) {
                setUserTier(data.tier as any);
            }
        })();
        return () => { cancelled = true; };
    }, [user]);

    // Close sidebar on resize to desktop
    useEffect(() => {
        const handler = () => {
            if (window.innerWidth >= 768) setSidebarOpen(true);
            else setSidebarOpen(false);
        };
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    // Close sidebar on mobile after navigating
    const handleViewChange = useCallback((view: AppView) => {
        setActiveView(view);
        if (isMobile()) setSidebarOpen(false);
    }, []);

    const handleGenerate = useCallback(async (request: PromptRequest) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await generatePrompt(request, settings);
            setCurrentPrompt(result);
            if (settings.autoSave) {
                addPrompt(result);
                setSavedIds(prev => new Set([...prev, result.id]));
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    }, [settings, addPrompt]);

    const handleSave = useCallback((prompt: GeneratedPrompt) => {
        addPrompt(prompt);
        setSavedIds(prev => new Set([...prev, prompt.id]));
    }, [addPrompt]);

    const handleSelectFromHistory = useCallback((prompt: GeneratedPrompt) => {
        setCurrentPrompt(prompt);
        setActiveView('generator');
        setSavedIds(prev => new Set([...prev, prompt.id]));
        if (isMobile()) setSidebarOpen(false);
    }, []);

    const handleSelectPreset = useCallback((preset: PresetIdea) => {
        setPresetIdea(preset.idea);
        setPresetStyle(preset.style);
        setPresetMood(preset.mood);
        setActiveView('generator');
        if (isMobile()) setSidebarOpen(false);
    }, []);

    const getViewTitle = (view: AppView): { title: string; subtitle: string } => {
        const titles: Record<AppView, { title: string; subtitle: string }> = {
            inicio: { title: 'Início', subtitle: 'Bem-vindo ao Umbra Prompt Lab' },
            perfil: { title: 'Perfil', subtitle: 'Suas informações e preferências' },
            generator: { title: 'Gerador', subtitle: 'Prompts anime profissionais' },
            grimorio: { title: 'Grimório de Personagens', subtitle: 'Personagens consistentes com IA' },
            sinopses: { title: 'Grimório das Sinopses', subtitle: 'Forja descrições de anime com IA' },
            isekai: { title: 'Planejador Isekai', subtitle: '70 perguntas · 7 seções · IA completa' },
            voiceforge: { title: 'VoiceForge', subtitle: 'Arquitetura vocal para VEO 3 — Powered by Mistral AI' },
            onomancer: { title: 'Umbra Onomancer', subtitle: '7 padrões autênticos · Gerador de nomes de anime' },
            umbravoz: { title: 'Umbra Voz', subtitle: 'Arquitetura vocal para VEO 3 · Chat interativo · Mistral AI' },
            umbracreator: { title: 'Umbra Creator', subtitle: '39 perguntas · 7 seções · Guia completo para criar seu anime' },
            history: { title: 'Histórico', subtitle: 'Seus prompts salvos' },
            presets: { title: 'Presets', subtitle: 'Inspiração instantânea' },
            galeria: { title: 'Galeria Umbra', subtitle: 'Database de prompts anime pros' },
            academia: { title: 'Academia de Anime', subtitle: 'Treinamento e Maestria em IA' },
            cenas: { title: 'Umbra Cenas', subtitle: 'Direção cinematográfica com IA' },
            promptscenas: { title: 'Umbra Prompts Cenas', subtitle: 'Arquitetura de cena avançada' },
            cenasestende: { title: 'Umbra Cenas Estende', subtitle: 'Expansão temporal de vídeo' },
            cenaslocais: { title: 'Umbra Cenas Locais', subtitle: 'Consistência de cenários e mundos' },
            promptsinicio: { title: 'Umbra Prompts Início', subtitle: 'Geração de keyframes base' },
            promptsvidy: { title: 'Umbra Prompts Vidy', subtitle: 'Prompts especializados para vídeo' },
            promptsloop: { title: 'Umbra Prompts Loop', subtitle: 'Geração de loops infinitos' },
            settings: { title: 'Configurações', subtitle: 'Personalize o laboratório' },
        };
        return titles[view];
    };

    const { title, subtitle } = getViewTitle(activeView);

    // If loading auth or no user, show the loader overlay
    if (authLoading || !user) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: '#0d0a05',
                fontFamily: "'Cinzel Decorative', serif",
            }}>
                <div style={{
                    fontSize: '2rem', marginBottom: '1.5rem',
                    background: 'linear-gradient(135deg,#8b6914,#f0d080)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    letterSpacing: '.1em',
                }}>✦ UMBRA</div>
                <div style={{
                    width: 28, height: 28, border: '2px solid #2a1f00',
                    borderTopColor: '#c9a84c', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
        );
    }

    return (
        <div className={`app-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>

            {/* Mobile backdrop — clicking it closes the sidebar */}
            {sidebarOpen && (
                <div
                    className="sidebar-backdrop"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Fechar menu"
                />
            )}

            <Sidebar
                activeView={activeView}
                onViewChange={handleViewChange}

                historyCount={history.length}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                user={user}
                onSignOut={signOut}
            />

            <div className="app-main">
                {/* Header */}
                <header className="app-header">
                    <div className="header-left">
                        {/* Hamburger / close button */}
                        <button
                            className="sidebar-toggle-btn"
                            onClick={() => setSidebarOpen(v => !v)}
                            aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
                            id="sidebar-toggle"
                        >
                            <span className={`hamburger-line ${sidebarOpen ? 'open' : ''}`} />
                            <span className={`hamburger-line ${sidebarOpen ? 'open' : ''}`} />
                            <span className={`hamburger-line ${sidebarOpen ? 'open' : ''}`} />
                        </button>
                        <div className="header-text">
                            <h1 className="header-title font-title shimmer-text">{title}</h1>
                            <p className="header-subtitle">{subtitle}</p>
                        </div>
                    </div>
                    <div className="header-ornament">✦ UMBRA ✦</div>
                </header>

                {/* Content */}
                <div className="app-content">
                    {/* Generator View */}
                    {activeView === 'generator' && (
                        <div className="generator-layout">
                            {/* Left: Form */}
                            <div className="generator-form-col panel-card">
                                <div className="col-inner-header">
                                    <span className="col-label">✦ Entrada</span>
                                </div>
                                <PromptForm
                                    onGenerate={handleGenerate}
                                    isLoading={isLoading}

                                    initialIdea={presetIdea}
                                    initialStyle={presetStyle}
                                    initialMood={presetMood}
                                />
                            </div>

                            {/* Right: Result */}
                            <div className="generator-result-col panel-card">
                                <div className="col-inner-header">
                                    <span className="col-label">✦ Resultado</span>
                                    {isLoading && <span className="rune-spinner" />}
                                </div>

                                {error && (
                                    <div className="error-banner fade-in">
                                        <span className="error-icon">⚠</span>
                                        <div>
                                            <strong>Erro na Invocação</strong>
                                            <p>{error}</p>
                                        </div>
                                        <button className="btn-icon" onClick={() => setError(null)}>✕</button>
                                    </div>
                                )}

                                {isLoading && !currentPrompt && (
                                    <div className="loading-state">
                                        <div className="loading-rune">✦</div>
                                        <p className="loading-text font-heading">Invocando o grimório...</p>
                                        <p className="loading-sub">O Umbra está construindo seu prompt perfeito</p>
                                    </div>
                                )}

                                {!isLoading && !currentPrompt && !error && (
                                    <div className="empty-state">
                                        <div className="empty-icon">📜</div>
                                        <div className="empty-title">Aguardando Invocação</div>
                                        <div className="empty-sub">Descreva sua ideia e clique em "Gerar Prompt".</div>
                                    </div>
                                )}

                                {currentPrompt && !isLoading && (
                                    <PromptResult
                                        prompt={currentPrompt}
                                        onSave={handleSave}
                                        isSaved={savedIds.has(currentPrompt.id)}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {activeView === 'inicio' && (
                        <div className="single-col-layout panel-card" style={{ textAlign: 'center', padding: '48px 32px' }}>
                            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🏠</div>
                            <h2 style={{ color: 'var(--gold-light)', fontFamily: 'var(--font-title)', marginBottom: '8px' }}>Bem-vindo ao Umbra Prompt Lab</h2>
                            <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 24px' }}>Seu estúdio de criação de prompts para anime. Escolha uma ferramenta na sidebar para começar.</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
                                {['✦ Gerador', '📖 Grimório', '🌀 Isekai', '🎙️ VoiceForge', '🎌 Onomancer'].map(t => (
                                    <span key={t} style={{ background: 'rgba(201,168,76,.12)', border: '1px solid var(--gold-dark)', color: 'var(--gold-light)', padding: '6px 16px', borderRadius: '20px', fontSize: '13px' }}>{t}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeView === 'perfil' && (
                        <div className="single-col-layout panel-card" style={{ padding: '40px 32px' }}>
                            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                                <div style={{ fontSize: '64px', marginBottom: '12px' }}>👤</div>
                                <h2 style={{ color: 'var(--gold-light)', fontFamily: 'var(--font-title)', marginBottom: '4px' }}>Perfil</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Umbra Prompt Lab v1.0</p>
                            </div>
                            <div style={{ display: 'grid', gap: '12px', maxWidth: '480px', margin: '0 auto' }}>
                                {[
                                    ['Plano Atual', userTier.toUpperCase()],
                                    ['✦ API Server', 'Ativo'],
                                    ['📊 Prompts Gerados', String(history.length)],
                                    ['⚡ Modelo', settings?.model ?? 'mistral-large-latest']
                                ].map(([label, val]) => (
                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{label}</span>
                                        <span style={{ color: label === 'Plano Atual' ? (userTier === 'turbo' ? '#f9d976' : 'var(--parchment)') : 'var(--gold-light)', fontSize: '14px', fontWeight: 600 }}>{val}</span>
                                    </div>
                                ))}

                                {/* Cakto Upgrade Button */}
                                <div style={{ marginTop: '12px' }}>
                                    <a
                                        href="https://pay.cakto.com.br/o35rxms_783593"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '10px',
                                            padding: '16px',
                                            background: 'linear-gradient(135deg, #d4af37 0%, #f9d976 50%, #d4af37 100%)',
                                            borderRadius: '8px',
                                            color: '#1a1501',
                                            textDecoration: 'none',
                                            fontWeight: 800,
                                            fontFamily: 'var(--font-heading)',
                                            textTransform: 'uppercase',
                                            fontSize: '14px',
                                            letterSpacing: '0.05em',
                                            boxShadow: '0 4px 20px rgba(212, 175, 55, 0.4)',
                                            transition: 'transform 0.2s ease'
                                        }}
                                        className="btn-cakto-upgrade"
                                    >
                                        <span style={{ fontSize: '18px' }}>✦</span>
                                        Upgrade para TURBO
                                    </a>
                                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '11px', marginTop: '12px', opacity: 0.6 }}>
                                        Pagamento seguro via Cakto
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeView === 'grimorio' && (
                        <div className="single-col-layout grimorio-col">
                            <GrimorioSinopses settings={settings} />
                        </div>
                    )}

                    {activeView === 'sinopses' && (
                        <div className="single-col-layout grimorio-col">
                            <SinopsesAgent settings={settings} />
                        </div>
                    )}

                    {activeView === 'isekai' && (
                        <div className="single-col-layout grimorio-col">
                            <IsekaiPlanner settings={settings} />
                        </div>
                    )}

                    {activeView === 'voiceforge' && (
                        <div className="single-col-layout grimorio-col">
                            <VoiceForge settings={settings} />
                        </div>
                    )}

                    {activeView === 'onomancer' && (
                        <div className="single-col-layout grimorio-col">
                            <UmbraOnomancer />
                        </div>
                    )}

                    {activeView === 'umbravoz' && (
                        <div className="single-col-layout grimorio-col">
                            <UmbraVoz settings={settings} />
                        </div>
                    )}

                    {activeView === 'umbracreator' && (
                        <div className="single-col-layout grimorio-col">
                            <UmbraCreator settings={settings} />
                        </div>
                    )}

                    {activeView === 'history' && (
                        <div className="single-col-layout panel-card">
                            <HistoryPanel
                                history={history}
                                onSelect={handleSelectFromHistory}
                                onDelete={removePrompt}
                                onClearAll={clearHistory}
                            />
                        </div>
                    )}

                    {activeView === 'presets' && (
                        <div className="single-col-layout panel-card">
                            <PresetsPanel onSelectPreset={handleSelectPreset} />
                        </div>
                    )}

                    {activeView === 'settings' && (
                        <div className="single-col-layout panel-card settings-col">
                            <SettingsPanel settings={settings} onUpdate={updateSettings} />
                        </div>
                    )}

                    {activeView === 'galeria' && (
                        <div className="single-col-layout">
                            <UmbraGallery />
                        </div>
                    )}

                    {activeView === 'academia' && (
                        <div className="single-col-layout">
                            <AcademiaAnime />
                        </div>
                    )}

                    {activeView === 'cenas' && (
                        <div className="single-col-layout">
                            <UmbraCenas mode="FULL_SCRIPT" settings={settings} />
                        </div>
                    )}

                    {activeView === 'promptscenas' && (
                        <div className="single-col-layout">
                            <UmbraCenas mode="PROMPTS" settings={settings} />
                        </div>
                    )}

                    {activeView === 'cenasestende' && (
                        <div className="single-col-layout">
                            <UmbraCenas mode="EXTEND" settings={settings} />
                        </div>
                    )}

                    {activeView === 'cenaslocais' && (
                        <div className="single-col-layout">
                            <UmbraCenas mode="LOCATIONS" settings={settings} />
                        </div>
                    )}

                    {['promptsinicio', 'promptsvidy', 'promptsloop'].includes(activeView) && (
                        <div className="single-col-layout panel-card" style={{ textAlign: 'center', padding: '100px 32px' }}>
                            <div className="loading-rune" style={{ fontSize: '4rem', marginBottom: '2rem' }}>✦</div>
                            <h2 className="font-title" style={{ color: 'var(--gold-light)', marginBottom: '1rem' }}>Santuário em Construção</h2>
                            <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto' }}>
                                Este agente está sendo forjado nas profundezas do Umbra Lab.
                                O acesso foi liberado para sua visualização, mas as funcionalidades completas chegarão em breve.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
