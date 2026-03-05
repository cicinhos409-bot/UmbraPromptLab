import React, { useState, useEffect } from 'react';
import { callMistralProxy } from '../../services/mistralProxy';
import { supabase } from '../../lib/supabase';
import './UmbraCenas.css';

interface CharacterProfile {
    id: string;
    name: string;
    description: string;
    personality: string;
    motivations: string;
    fears: string;
    relationship: string;
    currentEmotion: string;
    estadoEmocionalArco: string; // New
    relacionamentoElenco: string; // New
}

interface SceneV2 {
    titulo: string;
    tipo: string;
    duracao: number;
    descricao: string;
    dialogos: { personagem: string; fala: string; emocao?: string }[];
    emocao: string;
    proposito: string;
    ato?: number; // New: 1, 2 or 3
    direcao_cinematografica?: {
        angulos_camera: string;
        velocidade_corte: string;
        trilha_sonora: string;
        silencio_dramatico: boolean;
    };
}

interface EpisodeScriptResult {
    titulo_episodio?: string;
    sinopse?: string;
    total_minutos?: number;
    cenas: SceneV2[];
    melhorias_aplicadas: { area: string; descricao: string }[];
}

interface TechnicalPromptResult {
    prompts: {
        cena: string;
        prompt: string;
        negativo: string;
        estetica: string;
    }[];
}

interface UmbraCenasProps {
    mode: 'FULL_SCRIPT' | 'PROMPTS' | 'EXTEND' | 'LOCATIONS';
    settings?: any;
}

export const UmbraCenas: React.FC<UmbraCenasProps> = ({ mode }) => {
    // Shared State
    const [geAnimeTitle, setGeAnimeTitle] = useState('');
    const [geGenre, setGeGenre] = useState('Shonen');
    const [geEpNumber, setGeEpNumber] = useState(1);
    const [geEpTitle, setGeEpTitle] = useState('');
    const [geEpStructure, setGeEpStructure] = useState('Ação'); // This will be mapped to epType
    const [geTone, setGeTone] = useState('equilibrado');
    const [geType, setGeType] = useState('ação'); // backstory, transicao, acao, climax

    // Structured Memory
    const [gePrevEpisode, setGePrevEpisode] = useState('');
    const [geOpenConflicts, setGeOpenConflicts] = useState('');
    const [geWorldState, setGeWorldState] = useState('');

    const [geCharacterProfiles, setGeCharacterProfiles] = useState<CharacterProfile[]>([
        { id: '1', name: '', description: '', personality: '', motivations: '', fears: '', relationship: '', currentEmotion: '', estadoEmocionalArco: '', relacionamentoElenco: '' }
    ]);
    const [geEpisodeTheme, setGeEpisodeTheme] = useState('');
    const [geArcContext, setGeArcContext] = useState('');

    const [isGenerating, setIsGenerating] = useState(false);
    const [generationStage, setGenerationStage] = useState<'idle' | 'planejamento' | 'cenas' | 'ritmo' | 'dialogos'>('idle');
    const [sceneResult, setSceneResult] = useState<EpisodeScriptResult | null>(null);
    const [promptResult, setPromptResult] = useState<TechnicalPromptResult | null>(null);
    const [expandedSceneIdx, setExpandedSceneIdx] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [savedSeries, setSavedSeries] = useState<any[]>([]);
    const [currentSeriesId, setCurrentSeriesId] = useState<string | null>(null);

    // Character Profile management
    const handleCharacterProfileChange = (id: string, field: keyof CharacterProfile, value: string) => {
        setGeCharacterProfiles(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const addCharacterProfile = () => {
        setGeCharacterProfiles(prev => [
            ...prev,
            {
                id: Date.now().toString(),
                name: '',
                description: '',
                personality: '',
                motivations: '',
                fears: '',
                relationship: '',
                currentEmotion: '',
                estadoEmocionalArco: '',
                relacionamentoElenco: ''
            }
        ]);
    };

    const removeCharacterProfile = (id: string) => {
        setGeCharacterProfiles(prev => prev.length > 1 ? prev.filter(p => p.id !== id) : prev);
    };

    const fetchSeries = async () => {
        const { data, error } = await supabase.from('anime_series').select('*').order('created_at', { ascending: false });
        if (error) console.error('Error fetching series:', error);
        else setSavedSeries(data || []);
    };

    // Persistence: Load
    useEffect(() => {
        const saved = localStorage.getItem(`umbra_series_${geAnimeTitle || 'generic'}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.characterProfiles) setGeCharacterProfiles(parsed.characterProfiles);
                if (parsed.prevEpisode) setGePrevEpisode(parsed.prevEpisode);
                if (parsed.openConflicts) setGeOpenConflicts(parsed.openConflicts);
                if (parsed.worldState) setGeWorldState(parsed.worldState);
                if (parsed.genre) setGeGenre(parsed.genre);
            } catch (e) { console.error('Error loading from localStorage', e); }
        }
        fetchSeries();
    }, []);

    // Persistence: Save
    useEffect(() => {
        const data = {
            characterProfiles: geCharacterProfiles,
            prevEpisode: gePrevEpisode,
            openConflicts: geOpenConflicts,
            worldState: geWorldState,
            genre: geGenre
        };
        localStorage.setItem(`umbra_series_${geAnimeTitle || 'generic'}`, JSON.stringify(data));
    }, [geAnimeTitle, geCharacterProfiles, gePrevEpisode, geOpenConflicts, geWorldState, geGenre]);

    const generate = async () => {
        if (!geAnimeTitle.trim()) { alert('Informe o título do anime!'); return; }
        setIsGenerating(true);
        setError(null);
        setSceneResult(null);
        setPromptResult(null);
        setGenerationStage('planejamento');

        const characterContext = geCharacterProfiles.map(p =>
            `- ${p.name}: ${p.description}. Personalidade: ${p.personality}. Emoção no Arco: ${p.estadoEmocionalArco}. Relacionamentos: ${p.relacionamentoElenco}.`
        ).join('\n');

        const memoryContext = `
        EPISÓDIO ANTERIOR: ${gePrevEpisode}
        CONFLITOS EM ABERTO: ${geOpenConflicts}
        ESTADO DO MUNDO: ${geWorldState}
        `;

        let systemPrompt = '';
        let userPrompt = '';

        if (mode === 'FULL_SCRIPT') {
            systemPrompt = 'Você é um Roteirista de Anime Sênior especializado em estruturas de 3 atos.';
            userPrompt = `Gere roteiro de 15 CENAS (Ato 1: 1-5, Ato 2: 6-10, Ato 3: 11-15) de "${geAnimeTitle}". 
            Contexto: ${memoryContext} | Arco: ${geArcContext}
            Tom: ${geTone} | Estilo: ${geType} | Elenco: ${characterContext}
            Regras JSON (EpisodeScriptResult): 
            - Use campo "ato" (1, 2 ou 3). 
            - Diálogos curtos e impactantes. 
            - Seja conciso para evitar truncamento.`;
        } else if (mode === 'PROMPTS') {
            systemPrompt = 'Você é um Arquiteto de Prompts para VEO 3 e Midjourney.';
            userPrompt = `Gere 10 prompts técnicos de alta fidelidade para as cenas de "${geAnimeTitle}". 
            Foco em estética ${geGenre} e iluminação cinematográfica.
            Responda em JSON no formato TechnicalPromptResult.`;
        } else if (mode === 'EXTEND') {
            systemPrompt = 'Você é um Especialista em Expansão Narrativa.';
            userPrompt = `Expanda a cena atual de "${geAnimeTitle}" focando em micro-detalhes, tensão psicológica e atmosfera.
            Tema da Expansão: ${geEpisodeTheme}
            Responda em JSON com "titulo", "sinopse_expandida" e "detalhes_atmosfericos".`;
        } else if (mode === 'LOCATIONS') {
            systemPrompt = 'Você é um Concept Artist de Cenários de Anime.';
            userPrompt = `Descreva com detalhes de world-building as locações principais do episódio ${geEpNumber} de "${geAnimeTitle}".
            Consistência visual é prioridade. Responda em JSON com "locais": [{"nome", "atmosfera", "detalhes_visuais", "paleta_cores"}].`;
        }

        try {
            const resp = await callMistralProxy({
                model: 'mistral-large-latest',
                temperature: mode === 'FULL_SCRIPT' ? 0.3 : 0.85,
                max_tokens: mode === 'FULL_SCRIPT' ? 4000 : 2000,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ]
            });

            setGenerationStage('cenas');

            // Helper to sanitize and extract JSON
            const extractJson = (str: string) => {
                let cleaned = str.trim();
                // Remove Markdown blocks if present
                if (cleaned.startsWith('```')) {
                    cleaned = cleaned.replace(/^```json\s*/, '').replace(/```$/, '').trim();
                }

                try {
                    return JSON.parse(cleaned);
                } catch (e) {
                    console.warn('Initial JSON parse failed, attempting repair...', e);

                    // Simple repair for truncated arrays/objects
                    let repaired = cleaned;
                    const openBraces = (repaired.match(/\{/g) || []).length;
                    const closeBraces = (repaired.match(/\}/g) || []).length;
                    const openBrackets = (repaired.match(/\[/g) || []).length;
                    const closeBrackets = (repaired.match(/\]/g) || []).length;

                    // Close open structures in reverse order
                    if (openBrackets > closeBrackets) repaired += ' ]'.repeat(openBrackets - closeBrackets);
                    if (openBraces > closeBraces) repaired += ' }'.repeat(openBraces - closeBraces);

                    try {
                        return JSON.parse(repaired);
                    } catch (e2) {
                        // If still fails, try to find the last valid scene and close it
                        const lastValidIndex = cleaned.lastIndexOf('},');
                        if (lastValidIndex !== -1) {
                            repaired = cleaned.substring(0, lastValidIndex + 1) + ' ] }';
                            try { return JSON.parse(repaired); } catch (e3) { throw e; }
                        }
                        throw e;
                    }
                }
            };

            const data = extractJson(resp);

            await new Promise(r => setTimeout(r, 800));
            setGenerationStage('ritmo');
            await new Promise(r => setTimeout(r, 800));
            setGenerationStage('dialogos');
            await new Promise(r => setTimeout(r, 800));

            if (mode === 'FULL_SCRIPT') setSceneResult(data);
            else if (mode === 'PROMPTS') setPromptResult(data);
            else setSceneResult({ cenas: [], titulo_episodio: data.titulo || data.sinopse_expandida, sinopse: data.sinopse_expandida || data.atmosfera, melhorias_aplicadas: [], ...data } as EpisodeScriptResult);

        } catch (e: any) {
            const msg = e.message || '';
            if (msg.includes('500') || msg.includes('503') || msg.includes('Service unavailable') || msg.includes('internal_server_error')) {
                setError('O servidor da IA está temporariamente indisponível. A Mistral AI pode estar sobrecarregada. Aguarde alguns segundos e tente novamente.');
            } else if (msg.includes('429')) {
                setError('Limite de requisições atingido. Aguarde um minuto antes de tentar novamente.');
            } else {
                setError('Erro na conjuração: ' + msg);
            }
        } finally {
            setIsGenerating(false);
            setGenerationStage('idle');
        }
    };

    return (
        <div className="umbra-cenas-wrapper fade-in">
            <div className="cenas-main-container">
                {/* Standard Config Panel */}
                <div className="cenas-config-panel panel-card section-v2">
                    <div className="panel-header">
                        <span className="panel-icon">⚙️</span>
                        <h3>Configuração da Série</h3>
                    </div>

                    <div className="config-grid-v2">
                        <div className="input-field">
                            <label>Título do Projeto</label>
                            <input value={geAnimeTitle} onChange={e => setGeAnimeTitle(e.target.value)} placeholder="Ex: A Ascensão de Umbra" />
                        </div>
                        <div className="input-field">
                            <label>Gênero</label>
                            <select value={geGenre} onChange={e => setGeGenre(e.target.value)}>
                                <option>Shonen</option>
                                <option>Seinen</option>
                                <option>Isekai</option>
                                <option>Fantasy</option>
                            </select>
                        </div>
                    </div>

                    <div className="input-field mt-3">
                        <label>🧠 Memória da Série (Continuidade Estruturada)</label>
                        <div className="structured-memory-grid">
                            <textarea
                                value={gePrevEpisode}
                                onChange={e => setGePrevEpisode(e.target.value)}
                                placeholder="O que aconteceu no episódio anterior?"
                                className="small-area"
                            />
                            <textarea
                                value={geOpenConflicts}
                                onChange={e => setGeOpenConflicts(e.target.value)}
                                placeholder="Quais conflitos estão em aberto?"
                                className="small-area"
                            />
                            <textarea
                                value={geWorldState}
                                onChange={e => setGeWorldState(e.target.value)}
                                placeholder="Como está o estado atual do mundo?"
                                className="small-area"
                            />
                        </div>
                    </div>

                    <div className="character-profiles-section">
                        <div className="section-header">
                            <h4>Elenco Principal</h4>
                            <button className="btn-add-char" onClick={addCharacterProfile}>+ Adicionar</button>
                        </div>
                        <div className="char-profiles-grid">
                            {geCharacterProfiles.map((p, i) => (
                                <div key={p.id} className="char-profile-card">
                                    <div className="char-card-header">
                                        <input placeholder="Nome" value={p.name} onChange={e => handleCharacterProfileChange(p.id, 'name', e.target.value)} />
                                        <button className="btn-remove-char" onClick={() => removeCharacterProfile(p.id)}>✕</button>
                                    </div>
                                    <div className="char-card-grid">
                                        <textarea placeholder="Descrição e personalidade..." value={p.description} onChange={e => handleCharacterProfileChange(p.id, 'description', e.target.value)} />
                                        <div className="char-extra-inputs">
                                            <input placeholder="Emoção no arco..." value={p.estadoEmocionalArco} onChange={e => handleCharacterProfileChange(p.id, 'estadoEmocionalArco', e.target.value)} />
                                            <input placeholder="Relacionamentos..." value={p.relacionamentoElenco} onChange={e => handleCharacterProfileChange(p.id, 'relacionamentoElenco', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Mode Specific Controls */}
                <div className="cenas-execution-panel panel-card section-v2">
                    <div className="panel-header">
                        <span className="panel-icon">✦</span>
                        <h3>{mode === 'FULL_SCRIPT' ? 'Arquiteto de Episódios' : mode === 'PROMPTS' ? 'Prompts de Cena' : 'Ferramenta de Cena'}</h3>
                    </div>

                    <div className="details-grid-3">
                        <div className="input-field">
                            <label>Episódio #</label>
                            <input type="number" value={geEpNumber} onChange={e => setGeEpNumber(Number(e.target.value))} />
                        </div>
                        <div className="input-field">
                            <label>🎬 Tom</label>
                            <select value={geTone} onChange={e => setGeTone(e.target.value)}>
                                <option value="sombrio">Sombrio</option>
                                <option value="épico">Épico</option>
                                <option value="comédia">Comédia</option>
                                <option value="melancólico">Melancólico</option>
                                <option value="equilibrado">Equilibrado</option>
                            </select>
                        </div>
                        <div className="input-field">
                            <label>🏛️ Tipo</label>
                            <select value={geType} onChange={e => setGeType(e.target.value)}>
                                <option value="ação">Ação Pura</option>
                                <option value="transicao">Transição</option>
                                <option value="backstory">Backstory</option>
                                <option value="climax">Clímax de Arco</option>
                                <option value="exposição">Exposição / Lore</option>
                            </select>
                        </div>
                    </div>

                    <div className="input-field mt-3">
                        <label>Título do Episódio</label>
                        <input value={geEpTitle} onChange={e => setGeEpTitle(e.target.value)} placeholder="Ex: O Despertar da Fúria" />
                    </div>

                    <div className="input-field mt-3">
                        <label>Tema / Objetivo do Episódio</label>
                        <textarea value={geEpisodeTheme} onChange={e => setGeEpisodeTheme(e.target.value)} placeholder="O que deve acontecer neste episódio?" />
                    </div>

                    <button
                        className={`btn-forge-v2 ${isGenerating ? 'loading' : ''}`}
                        onClick={generate}
                        disabled={isGenerating}
                    >
                        {isGenerating ? (
                            <div className="generation-status-v2">
                                <span className="spinner" />
                                <div className="status-labels">
                                    <span className={generationStage === 'planejamento' ? 'active' : ''}>Planejamento</span>
                                    <span className={generationStage === 'cenas' ? 'active' : ''}>Escrita de Cenas</span>
                                    <span className={generationStage === 'ritmo' ? 'active' : ''}>Revisão de Ritmo</span>
                                    <span className={generationStage === 'dialogos' ? 'active' : ''}>Polimento de Diálogos</span>
                                </div>
                            </div>
                        ) : (
                            `✦ Forjar ${mode === 'FULL_SCRIPT' ? 'Roteiro (15 Cenas)' : mode === 'PROMPTS' ? 'Prompts' : mode === 'EXTEND' ? 'Expansão' : 'Locais'} ✦`
                        )}
                    </button>
                </div>
            </div>

            {/* Results Display */}
            <div className="cenas-result-area">
                {error && (
                    <div className="error-msg fade-in">
                        <span>⚠️ {error}</span>
                        <button className="btn-retry" onClick={() => { setError(null); generate(); }}>🔄 Tentar Novamente</button>
                    </div>
                )}

                {mode === 'FULL_SCRIPT' && sceneResult && (
                    <div className="script-output fade-in">
                        <div className="result-header">
                            <h2>{sceneResult.titulo_episodio}</h2>
                            <p className="synopsis">{sceneResult.sinopse}</p>
                        </div>

                        <div className="episode-map-v2">
                            {[1, 2, 3].map(atoNum => (
                                <div key={atoNum} className="act-section">
                                    <div className="act-header">Ato {atoNum}</div>
                                    <div className="scenes-grid-v2">
                                        {sceneResult.cenas
                                            .filter(s => s.ato === atoNum || (!s.ato && Math.ceil((sceneResult.cenas.indexOf(s) + 1) / 5) === atoNum))
                                            .map((s, idxInAto) => {
                                                const globalIdx = sceneResult.cenas.indexOf(s);
                                                const isExpanded = expandedSceneIdx === globalIdx;
                                                return (
                                                    <div
                                                        key={globalIdx}
                                                        className={`scene-mini-card ${isExpanded ? 'expanded' : ''}`}
                                                        onClick={() => setExpandedSceneIdx(isExpanded ? null : globalIdx)}
                                                    >
                                                        <span className="mini-num">Cena {globalIdx + 1}</span>
                                                        <span className="mini-title">{s.titulo}</span>

                                                        {isExpanded && (
                                                            <div className="scene-full-content">
                                                                <p className="full-desc">{s.descricao}</p>
                                                                <div className="dialogues-v2">
                                                                    {s.dialogos.map((d, di) => (
                                                                        <div key={di} className="dialogue-item">
                                                                            <span className="dialogue-char">{d.personagem}:</span>
                                                                            <span className="dialogue-text">"{d.fala}"</span>
                                                                            {d.emocao && <span className="dialogue-emocao"> ({d.emocao})</span>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                {s.direcao_cinematografica && (
                                                                    <div className="cinematic-notes mt-2">
                                                                        <span>🎬 {s.direcao_cinematografica.angulos_camera}</span>
                                                                        <span>🎵 {s.direcao_cinematografica.trilha_sonora}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {mode === 'EXTEND' && sceneResult && (
                    <div className="extend-output fade-in">
                        <div className="result-header">
                            <span className="badge-v2">Expansão Narrativa</span>
                            <h2>{sceneResult.titulo_episodio}</h2>
                            <div className="glass-panel mt-3">
                                <p className="synopsis-large">{sceneResult.sinopse}</p>
                            </div>
                        </div>
                    </div>
                )}

                {mode === 'LOCATIONS' && sceneResult && (sceneResult as any).locais && (
                    <div className="locations-output fade-in">
                        <h3>Geografia do Mundo (Locações)</h3>
                        <div className="locations-grid">
                            {(sceneResult as any).locais.map((loc: any, i: number) => (
                                <div key={i} className="location-card">
                                    <div className="l-header">
                                        <h4>{loc.nome}</h4>
                                        <span className="l-palette" style={{ background: loc.paleta_cores }}></span>
                                    </div>
                                    <div className="l-atmosphere">✨ {loc.atmosfera}</div>
                                    <p className="l-details">{loc.detalhes_visuais}</p>
                                    <div className="l-colors">Paleta: {loc.paleta_cores}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {mode === 'PROMPTS' && promptResult && (
                    <div className="prompts-output fade-in">
                        <h3>Pergaminhos Técnicos (Keyframes)</h3>
                        <div className="prompts-grid">
                            {promptResult.prompts.map((p, i) => (
                                <div key={i} className="prompt-card">
                                    <div className="p-header">{p.cena}</div>
                                    <div className="p-content">{p.prompt}</div>
                                    <div className="p-negative"><strong>Negative:</strong> {p.negativo}</div>
                                    <div className="p-style">Estética: {p.estetica}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {!isGenerating && !sceneResult && !promptResult && !error && (
                    <div className="empty-state">
                        <div className="rune-big">✦</div>
                        <p>O Agente do Umbra aguarda suas diretrizes para iniciar a forja...</p>
                    </div>
                )}
            </div>
        </div>
    );
};
