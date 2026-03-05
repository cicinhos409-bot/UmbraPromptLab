import React, { useState, useEffect } from 'react';
import { callMistralProxy } from '../../services/mistralProxy';
import { supabase } from '../../lib/supabase';
import './AcademiaAnime.css';

interface CharacterResult {
    name: string;
    aka?: string;
    role?: string;
    physical?: string;
    personality?: string;
    development?: string;
    quote?: string;
    essence?: string;
}

interface CharacterProfile {
    id: string;
    name: string;
    description: string;
    personality: string;
    motivations: string;
    fears: string;
    relationship: string;
    currentEmotion: string;
}

interface SceneV2 {
    titulo: string;
    tipo: string;
    duracao: number;
    descricao: string;
    dialogos: { personagem: string; fala: string; emocao?: string }[];
    emocao: string;
    proposito: string;
    direcao_cinematografica?: {
        angulos_camera: string;
        velocidade_corte: string;
        trilha_sonora: string;
        silencio_dramatico: boolean;
    };
}

interface SeriesResult {
    titulo?: string;
    genero?: string;
    logline?: string;
    visao_geral?: string;
    estetica?: string;
    temas?: string[];
    premissa?: string;
    personagens?: { nome: string; papel: string; descricao: string }[];
}

export interface ScriptEpisodeInput {
    num: number;
    title: string;
    chars: number;
}

export interface ScriptResult {
    sinopseGeral: string;
    episodios: {
        numero: number;
        titulo: string;
        resumo: string;
        atos: {
            inicio: string;
            meio: string;
            fim: string;
        };
    }[];
    personagens_destacados: {
        episodio_introducao: number;
        nome: string;
        papel: string;
    }[];
    checklist_narrativo: {
        ok: boolean;
        texto: string;
    }[];
}

export interface EpisodeScriptResult {
    titulo_episodio?: string;
    sinopse?: string;
    total_minutos?: number;
    cenas: SceneV2[];
    melhorias_aplicadas: { area: string; descricao: string }[];
}



const STEPS = [
    'Grimório de Personagens',
    'Crie Sua Série de Anime',
    'Agente de Roteiro',
    'Grimório de Episódios',
];

export const AcademiaAnime: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(0);

    // Form state for Step 0 (Grimório de Personagens)
    const [charName, setCharName] = useState('');
    const [charAka, setCharAka] = useState('');
    const [charUniverse, setCharUniverse] = useState('');
    const [charPhysical, setCharPhysical] = useState('');
    const [charPersonality, setCharPersonality] = useState('');
    const [charRole, setCharRole] = useState('');
    const [charDevelopment, setCharDevelopment] = useState('');
    const [charPowers, setCharPowers] = useState('');

    const [isInvoking, setIsInvoking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<CharacterResult | null>(null);

    // Form state for Step 1 (Crie Sua Série de Anime)
    const [seriesPrompt, setSeriesPrompt] = useState('');
    const [isGeneratingSeries, setIsGeneratingSeries] = useState(false);
    const [seriesResult, setSeriesResult] = useState<SeriesResult | null>(null);
    const [seriesError, setSeriesError] = useState<string | null>(null);

    // Form state for Step 2 (Agente de Roteiro)
    const [arTitle, setArTitle] = useState('');
    const [arGenre, setArGenre] = useState('classic');
    const [arEpCount, setArEpCount] = useState(12);
    const [arPremise, setArPremise] = useState('');
    const [arProtagonist, setArProtagonist] = useState('');
    const [arTone, setArTone] = useState('serious');
    const [arConflict, setArConflict] = useState('external');
    const [arFocus, setArFocus] = useState('protagonist');
    const [arAntagonist, setArAntagonist] = useState('');
    const [arMustHave, setArMustHave] = useState('');

    const [arEpisodesInput, setArEpisodesInput] = useState<ScriptEpisodeInput[]>([]);
    const [isGeneratingScript, setIsGeneratingScript] = useState(false);
    const [scriptResult, setScriptResult] = useState<ScriptResult | null>(null);
    const [scriptError, setScriptError] = useState<string | null>(null);
    const [expandedEp, setExpandedEp] = useState<number | null>(null);

    // Form state for Step 3 (Grimório de Episódios / Umbra Cenas V2)
    const [geAnimeTitle, setGeAnimeTitle] = useState('');
    const [geGenre, setGeGenre] = useState('');
    const [geEpNumber, setGeEpNumber] = useState(1);
    const [geEpTitle, setGeEpTitle] = useState('');
    const [geEpStructure, setGeEpStructure] = useState('ação');
    const [geTone, setGeTone] = useState('equilibrado');
    const [geSeriesMemory, setGeSeriesMemory] = useState('');
    const [geCharacterProfiles, setGeCharacterProfiles] = useState<CharacterProfile[]>([
        { id: '1', name: '', description: '', personality: '', motivations: '', fears: '', relationship: '', currentEmotion: '' }
    ]);
    const [geEpisodeTheme, setGeEpisodeTheme] = useState('');
    const [geArcContext, setGeArcContext] = useState('');

    const [isGeneratingScene, setIsGeneratingScene] = useState(false);
    const [generationStage, setGenerationStage] = useState<'idle' | 'drafting' | 'reviewing'>('idle');
    const [sceneResult, setSceneResult] = useState<EpisodeScriptResult | null>(null);
    const [sceneError, setSceneError] = useState<string | null>(null);

    const [savedSeries, setSavedSeries] = useState<any[]>([]);
    const [currentSeriesId, setCurrentSeriesId] = useState<string | null>(null);

    // Character Profile management
    const handleCharacterProfileChange = (id: string, field: keyof CharacterProfile, value: string) => {
        setGeCharacterProfiles(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const addCharacterProfile = () => {
        setGeCharacterProfiles(prev => [
            ...prev,
            { id: Date.now().toString(), name: '', description: '', personality: '', motivations: '', fears: '', relationship: '', currentEmotion: '' }
        ]);
    };

    const removeCharacterProfile = (id: string) => {
        setGeCharacterProfiles(prev => prev.length > 1 ? prev.filter(p => p.id !== id) : prev);
    };

    const genreDefaults: Record<string, number[]> = {
        classic: [3, 1, 1, 2, 1, 0, 2, 1, 0, 1, 0, 0],
        dark: [2, 1, 2, 1, 3, 1, 1, 1, 2, 0, 0, 0],
        op: [1, 2, 1, 3, 1, 4, 1, 1, 2, 0, 0, 0]
    };

    useEffect(() => {
        const epTitles: Record<string, string[]> = {
            classic: ['O Choque', 'Primeiro Laço', 'O Mundo Reage', 'Expansão', 'Conflito', 'Meio da Temporada', 'Novo Arco', 'Consequências', 'Pressão', 'Preparação do Clímax', 'Clímax', 'Fechamento'],
            dark: ['A Escuridão Chama', 'Primeiros Passos', 'Reflexos do Passado', 'Sombras', 'A Escolha', 'Ruptura', 'Espelhos', 'Cicatrizes', 'A Verdade', 'Abismo', 'Sacrifício', 'Silêncio Final'],
            op: ['O Rei Renasceu', 'Poder Sem Limite', 'O Mundo Aprende', 'Desafios', 'Digno?', 'Além dos Limites', 'Ameaça', 'Esmagadora', 'Segredo', 'Clímax de Poder', 'O Inimigo', 'Lenda'],
        };

        const count = arEpCount;
        const defs = genreDefaults[arGenre] || genreDefaults['classic'];
        const titles = epTitles[arGenre] || [];

        const newEps = [];
        for (let i = 0; i < count; i++) {
            newEps.push({
                num: i + 1,
                title: titles[i] || `Episódio ${i + 1}`,
                chars: defs[i] !== undefined ? defs[i] : 1
            });
        }
        setArEpisodesInput(newEps);
    }, [arGenre, arEpCount]);

    const invokeCharacter = async () => {
        if (!charName.trim()) { alert('Informe pelo menos o nome do personagem!'); return; }

        setIsInvoking(true);
        setError(null);
        setResult(null);

        const prompt = `Você é um mestre criador de personagens de anime. Com base nas informações abaixo, escreva uma ficha rica, detalhada e literária. Escreva em português do Brasil.

DADOS:
- Nome: ${charName}
- A.K.A.: ${charAka || 'não informado'}
- Universo/Anime: ${charUniverse || 'original'}
- Aparência Física: ${charPhysical || 'não informado'}
- Personalidade: ${charPersonality || 'não informado'}
- Papel/Função: ${charRole || 'não informado'}
- Desenvolvimento: ${charDevelopment || 'não informado'}
- Habilidades: ${charPowers || 'não informado'}

Responda SOMENTE com JSON válido, sem markdown, sem texto extra, sem blocos de código:
{"name":"nome completo","aka":"apelidos épicos elaborados","role":"papel em frase curta","physical":"descrição física vívida em 3-4 linhas","personality":"personalidade aprofundada em 4-5 linhas","development":"arco de desenvolvimento em 4-5 linhas","quote":"frase marcante épica que o personagem diria","essence":"essência do personagem em uma frase poética"}`;

        try {
            const rawContent = await callMistralProxy({
                model: 'mistral-large-latest',
                temperature: 0.85,
                max_tokens: 2000,
                response_format: { type: 'json_object' },
                messages: [{ role: 'user', content: prompt }]
            });

            let raw = rawContent.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
            const char = JSON.parse(raw);
            setResult(char);
        } catch (e: any) {
            setError(e.message || 'Erro desconhecido');
        } finally {
            setIsInvoking(false);
        }
    };

    const generateSeries = async () => {
        if (!seriesPrompt.trim()) return;

        setIsGeneratingSeries(true);
        setSeriesError(null);
        setSeriesResult(null);

        const promptTemplate = `Você é um criador de séries de anime especializado. Com base na seguinte ideia: "${seriesPrompt}"
    
Crie uma visão geral completa da série em JSON com exatamente este formato:
{
  "titulo": "título da série em japonês romanizado com tradução",
  "genero": "gêneros separados por · ",
  "logline": "logline de 1-2 frases impactantes",
  "visao_geral": "parágrafo de visão geral da série (3-5 frases)",
  "estetica": "descrição da estética visual e estilo de animação (3-4 frases)",
  "temas": ["tema1", "tema2", "tema3", "tema4", "tema5", "tema6"],
  "premissa": "descrição da premissa e ambientação (3-5 frases)",
  "personagens": [
    { "nome": "Nome", "papel": "Papel · Arquétipo", "descricao": "descrição do personagem" },
    { "nome": "Nome", "papel": "Papel · Arquétipo", "descricao": "descrição do personagem" },
    { "nome": "Nome", "papel": "Papel · Arquétipo", "descricao": "descrição do personagem" }
  ]
}
Responda APENAS com o JSON, sem markdown.`;

        try {
            const rawContent = await callMistralProxy({
                model: 'mistral-large-latest',
                temperature: 0.85,
                max_tokens: 3000,
                response_format: { type: 'json_object' },
                messages: [{ role: 'user', content: promptTemplate }]
            });

            let raw = rawContent.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
            const series = JSON.parse(raw);
            setSeriesResult(series);
        } catch (e: any) {
            setSeriesError(e.message || 'Erro desconhecido');
        } finally {
            setIsGeneratingSeries(false);
        }
    };

    const generateScript = async () => {
        setIsGeneratingScript(true);
        setScriptError(null);
        setScriptResult(null);

        const promptTemplate = `Atue como um Especialista e Agente de Roteiro de Anime.
Preciso de um resumo estruturado de temporada para o meu novo anime:
- Título: ${arTitle || 'Anime Sem Título'}
- Gênero: ${arGenre}
- Episódios: ${arEpCount}
- Premissa Inicial: ${arPremise}
- Protagonista: ${arProtagonist}
- Tom Geral: ${arTone}
- Conflito Principal: ${arConflict}
- Foco dos Episódios: ${arFocus}
- Antagonista: ${arAntagonist}
- Elementos Obrigatórios: ${arMustHave}

Distribuição de personagens novos por episódio:
${arEpisodesInput.map(ep => `- Ep ${ep.num} (${ep.title}): +${ep.chars} novos`).join('\n')}

Forneça a saída ESTRITAMENTE em formato JSON:
{
  "sinopseGeral": "Texto da sinopse geral da temporada em 2-3 parágrafos",
  "episodios": [
    {
      "numero": 1,
      "titulo": "Título Gerado do ep 1",
      "resumo": "Um parágrafo de resumo coerente",
      "atos": {
        "inicio": "Descrição do primeiro ato",
        "meio": "Descrição do segundo ato",
        "fim": "Descrição terceiro ato/gancho"
      }
    }
  ],
  "personagens_destacados": [
    {
      "episodio_introducao": 1,
      "nome": "Nome do Personagem",
      "papel": "Papel estrutural (ex: Mentor, Rival)"
    }
  ],
  "checklist_narrativo": [
    { "ok": true, "texto": "Análise crítica do balanceamento" }
  ]
}
Responda APENAS com JSON válido.`;

        try {
            const rawContent = await callMistralProxy({
                model: 'mistral-large-latest',
                temperature: 0.85,
                max_tokens: 4000,
                response_format: { type: 'json_object' },
                messages: [{ role: 'user', content: promptTemplate }]
            });

            let raw = rawContent.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
            const result = JSON.parse(raw);
            setScriptResult(result);
        } catch (e: any) {
            setScriptError(e.message || 'Erro desconhecido ao invocar Agente de Roteiro');
        } finally {
            setIsGeneratingScript(false);
        }
    };

    // persistence logic
    const fetchSeries = async () => {
        const { data, error } = await supabase.from('anime_series').select('*').order('created_at', { ascending: false });
        if (error) console.error('Error fetching series:', error);
        else setSavedSeries(data || []);
    };

    useEffect(() => {
        fetchSeries();
    }, []);

    const generateEpisodeV2 = async () => {
        if (!geAnimeTitle.trim()) { alert('Informe o título do anime!'); return; }

        setIsGeneratingScene(true);
        setSceneError(null);
        setSceneResult(null);
        setGenerationStage('drafting');

        const characterContext = geCharacterProfiles.map(p =>
            `- ${p.name}: ${p.description}. Personalidade: ${p.personality}. Motivações: ${p.motivations}. Relação: ${p.relationship}. Emoção Atual: ${p.currentEmotion}`
        ).join('\n');

        const draftPrompt = `Você é um Agente de Roteiro Sênior especializado em animes. 
CONTEXTO DA SÉRIE:
Título: ${geAnimeTitle}
Gênero: ${geGenre}
Memória da Série (O que aconteceu antes): ${geSeriesMemory || 'Início da série.'}
Arco Atual: ${geArcContext}

PERSONAGENS:
${characterContext}

EPISÓDIO ATUAL:
Número: ${geEpNumber}
Título: ${geEpTitle}
Tema: ${geEpisodeTheme}
Estrutura: ${geEpStructure}
Tom: ${geTone}

TAREFA: Gere um RASCUNHO DETALHADO do roteiro deste episódio.
O roteiro deve conter uma sequência de cenas (mínimo 6). Cada cena deve ter:
1. Título e Tipo (Expansão, Ação, Diálogo, etc.)
2. Descrição visual e de ação detalhada.
3. Diálogos autênticos que respeitem a personalidade dos personagens.
4. Emoção predominante e Propósito narrativo.

Responda em PORTUGUÊS DO BRASIL.
Responda APENAS com JSON no seguinte formato:
{
  "titulo_episodio": "título",
  "sinopse": "resumo do ep",
  "cenas": [
    {
      "titulo": "título da cena",
      "tipo": "Ação/Diálogo/etc",
      "duracao": segundos,
      "descricao": "...",
      "dialogos": [{"personagem": "Nome", "fala": "...", "emocao": "..."}],
      "emocao": "...",
      "proposito": "..."
    }
  ]
}`;

        try {
            // STEP 1: DRAFTING
            const draftResponse = await callMistralProxy({
                model: 'mistral-large-latest',
                temperature: 0.7,
                response_format: { type: 'json_object' },
                messages: [{ role: 'user', content: draftPrompt }]
            });

            const draft = JSON.parse(draftResponse);
            setGenerationStage('reviewing');

            // STEP 2: REVISION (Director Agent)
            const revisionPrompt = `Você é o Diretor Cinematográfico do Umbra Studio. Sua tarefa é REVISAR o rascunho de roteiro abaixo e elevar sua qualidade para o Nível Premium.

RASCUNHO:
${JSON.stringify(draft, null, 2)}

SUAS DIRETRIZES DE MELHORIA:
1. Adicione "direcao_cinematografica" para cada cena (angulos_camera, velocidade_corte, trilha_sonora, silencio_dramatico).
2. Refine os diálogos para que soem mais "puros" e menos expositivos.
3. Garanta que o Tom "${geTone}" esteja presente em cada palavra.
4. Adicione um campo "melhorias_aplicadas" no final listando o que você mudou.

Responda APENAS com o JSON FINAL no formato EpisodeScriptResult (já definido no projeto).`;

            const finalResponse = await callMistralProxy({
                model: 'mistral-large-latest',
                temperature: 0.5,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: 'Você é um Diretor de Anime especialista em JSON.' },
                    { role: 'user', content: revisionPrompt }
                ]
            });

            const finalScript = JSON.parse(finalResponse);
            setSceneResult(finalScript as any);

            if (currentSeriesId) {
                await saveEpisodeToSupabase(finalScript);
            }

        } catch (e: any) {
            setSceneError('Erro na conjuração do roteiro: ' + e.message);
        } finally {
            setIsGeneratingScene(false);
            setGenerationStage('idle');
        }
    };

    const saveEpisodeToSupabase = async (script: EpisodeScriptResult) => {
        if (!currentSeriesId) return;

        const { error } = await supabase.from('anime_episodes').insert({
            series_id: currentSeriesId,
            episode_number: geEpNumber,
            title: geEpTitle || script.titulo_episodio,
            content: script
        });

        if (error) {
            console.error('Error saving episode:', error);
        }
    };

    const renderEpisodeResult = (epResult: EpisodeScriptResult) => {
        return (
            <div className="episode-result-v2 fade-in">
                <div className="episode-result-header-v2">
                    <h2>{epResult.titulo_episodio}</h2>
                    <p className="episode-synopsis-v2">{epResult.sinopse}</p>
                </div>

                <div className="scenes-timeline-v2">
                    {epResult.cenas.map((scene, i) => (
                        <div key={i} className="scene-block-v2">
                            <div className="scene-header-v2">
                                <span className="scene-number-v2">{String(i + 1).padStart(2, '0')}</span>
                                <div className="scene-title-wrapper-v2">
                                    <h3>{scene.titulo}</h3>
                                    <span className={`scene-type-v2 type-${scene.tipo.toLowerCase()}`}>{scene.tipo}</span>
                                </div>
                                <span className="scene-duration-v2">{scene.duracao}s</span>
                            </div>

                            <div className="scene-body-v2">
                                <div className="scene-visual-v2">
                                    <div className="scene-label-v2">VISUAL & AÇÃO</div>
                                    <p>{scene.descricao}</p>
                                </div>

                                {scene.dialogos && scene.dialogos.length > 0 && (
                                    <div className="scene-dialogues-v2">
                                        <div className="scene-label-v2">DIÁLOGOS</div>
                                        {scene.dialogos.map((d, di) => (
                                            <div key={di} className="dialogue-line-v2">
                                                <span className="char-name-v2">{d.personagem}:</span>
                                                <span className="char-speech-v2">"{d.fala}"</span>
                                                <span className="char-emotion-v2">({d.emocao})</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {scene.direcao_cinematografica && (
                                    <div className="scene-direction-v2">
                                        <div className="scene-label-v2">DIREÇÃO CINEMATOGRÁFICA</div>
                                        <ul>
                                            <li><span>Câmera:</span> {scene.direcao_cinematografica.angulos_camera}</li>
                                            <li><span>Corte:</span> {scene.direcao_cinematografica.velocidade_corte}</li>
                                            <li><span>Trilha:</span> {scene.direcao_cinematografica.trilha_sonora}</li>
                                            <li><span>Efeito:</span> {scene.direcao_cinematografica.silencio_dramatico}</li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {epResult.melhorias_aplicadas && (
                    <div className="revision-notes-v2">
                        <div className="scene-label-v2">NOTAS DO DIRETOR (MELHORIAS)</div>
                        <ul>
                            {epResult.melhorias_aplicadas.map((m, mi) => (
                                <li key={mi}>
                                    <strong>{m.area}:</strong> {m.descricao}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="academia-wrapper fade-in">
            {/* Horizontal Stepper Header */}
            <div className="wizard-header">
                <div className="wizard-stepper">
                    {STEPS.map((step, idx) => {
                        const isActive = idx === currentStep;
                        const isPast = idx < currentStep;
                        return (
                            <div key={idx} className={`wizard - step ${isActive ? 'active' : ''} ${isPast ? 'completed' : ''} `} onClick={() => setCurrentStep(idx)}>
                                <div className="step-circle">{idx + 1}</div>
                                <div className="step-title">{step}</div>
                                {idx < STEPS.length - 1 && <div className="step-connector"></div>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Step Content */}
            <div className="wizard-content">
                {currentStep === 0 && (
                    <div className="grimoire-container fade-in">
                        <header className="grimoire-header">
                            <div className="grimoire-title">Grimório de Personagens</div>
                            <div className="grimoire-subtitle">⸻ Forjador de Almas Animadas ⸻</div>
                        </header>

                        <div className="grimoire-main">
                            {/* Left Panel: Form */}
                            <div className="g-panel">
                                <div className="corner tl"></div><div className="corner tr"></div>
                                <div className="corner bl"></div><div className="corner br"></div>
                                <div className="panel-title">✦ Inscrições do Conjurador ✦</div>

                                <div className="form-group">
                                    <label>📜 Nome do Personagem</label>
                                    <input type="text" value={charName} onChange={e => setCharName(e.target.value)} placeholder="Ex: Ryuji Takahashi" />
                                </div>
                                <div className="form-group">
                                    <label>⚔️ A.K.A. — Também Conhecido Como</label>
                                    <input type="text" value={charAka} onChange={e => setCharAka(e.target.value)} placeholder="Ex: O Lobo Vermelho, Shinigami das Sombras..." />
                                </div>
                                <div className="form-group">
                                    <label>🏮 Universo / Anime</label>
                                    <input type="text" value={charUniverse} onChange={e => setCharUniverse(e.target.value)} placeholder="Ex: Naruto, Attack on Titan, original..." />
                                </div>
                                <div className="form-group">
                                    <label>👁️ Aparência Física — Physical</label>
                                    <textarea value={charPhysical} onChange={e => setCharPhysical(e.target.value)} placeholder="Descreva: altura, olhos, cabelo, cicatrizes, vestimenta..."></textarea>
                                </div>
                                <div className="form-group">
                                    <label>🌀 Personalidade — Personality</label>
                                    <textarea value={charPersonality} onChange={e => setCharPersonality(e.target.value)} placeholder="Como ele age, traços de caráter, medos, virtudes..."></textarea>
                                </div>
                                <div className="form-group">
                                    <label>⚡ Papel / Função — Role</label>
                                    <input type="text" value={charRole} onChange={e => setCharRole(e.target.value)} placeholder="Ex: Protagonista, vilão, mentor, aliado..." />
                                </div>
                                <div className="form-group">
                                    <label>🌱 Desenvolvimento / Evolução — Development</label>
                                    <textarea value={charDevelopment} onChange={e => setCharDevelopment(e.target.value)} placeholder="Arco de evolução, traumas, transformações, motivações..."></textarea>
                                </div>
                                <div className="form-group">
                                    <label>✨ Habilidades / Poderes (opcional)</label>
                                    <input type="text" value={charPowers} onChange={e => setCharPowers(e.target.value)} placeholder="Ex: controle de fogo, telepatia, força sobre-humana..." />
                                </div>

                                <button className="btn-invoke" onClick={invokeCharacter} disabled={isInvoking}>
                                    {isInvoking ? '⟳ Conjurando...' : '✦ Invocar Personagem ✦'}
                                </button>
                            </div>

                            {/* Right Panel: Result */}
                            <div className="g-panel">
                                <div className="corner tl"></div><div className="corner tr"></div>
                                <div className="corner bl"></div><div className="corner br"></div>
                                <div className="panel-title">✦ Ficha do Ser Convocado ✦</div>

                                <div className={`char - sheet ${isInvoking || result || error ? 'visible' : ''} `}>
                                    {isInvoking && (
                                        <div className="loading-shimmers">
                                            <div className="shimmer" style={{ width: '55%', margin: '0 auto 6px' }}></div>
                                            <div className="shimmer" style={{ width: '38%', margin: '0 auto 18px' }}></div>
                                            <div className="shimmer"></div>
                                            <div className="shimmer" style={{ width: '88%' }}></div>
                                            <div className="shimmer" style={{ width: '76%' }}></div>
                                            <div className="shimmer"></div>
                                            <div className="shimmer" style={{ width: '82%' }}></div>
                                            <div className="shimmer" style={{ width: '68%' }}></div>
                                        </div>
                                    )}

                                    {error && !isInvoking && (
                                        <div className="error-msg">⚠️ Falha na invocação:<br /><small style={{ opacity: 0.8 }}>{error}</small></div>
                                    )}

                                    {!isInvoking && !result && !error && (
                                        <div className="placeholder-msg">
                                            <div style={{ fontSize: '2rem', margin: '0 auto 16px', opacity: 0.3 }}>⧫</div>
                                            Preencha o formulário ao lado<br />e invoque seu personagem ao mundo...
                                        </div>
                                    )}

                                    {result && !isInvoking && (
                                        <div className="char-result-content">
                                            <div className="char-name">{result.name}</div>
                                            {result.aka && <div className="char-aka">「 {result.aka} 」</div>}
                                            {result.role && <div className="role-badge">{result.role}</div>}

                                            <div className="divider"></div>

                                            <div className="section-label">👁️ Aparência</div>
                                            <div className="section-content">{result.physical || '—'}</div>

                                            <div className="section-label">🌀 Personalidade</div>
                                            <div className="section-content">{result.personality || '—'}</div>

                                            <div className="section-label">🌱 Desenvolvimento</div>
                                            <div className="section-content">{result.development || '—'}</div>

                                            <div className="divider"></div>

                                            {result.quote && <div className="char-quote">"{result.quote}"</div>}
                                            {result.essence && (
                                                <div className="char-essence">
                                                    <div className="essence-label">⸻ Essência ⸻</div>
                                                    <div className="essence-text">{result.essence}</div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 1 && (
                    <div className="series-container fade-in">
                        {!seriesResult && !isGeneratingSeries && !seriesError ? (
                            <div className="screen-input">
                                <header className="series-header-main">
                                    <p className="header-eyebrow">Academia de Anime</p>
                                    <h1 className="font-title shimmer-text">Crie Sua Série de Anime</h1>
                                    <p>Dê vida à sua visão criativa com o desenvolvimento de séries com IA</p>
                                </header>

                                <div className="ornament">
                                    <div className="ornament-line"></div>
                                    <div className="ornament-diamond"></div>
                                    <div className="ornament-line"></div>
                                </div>

                                <div className="input-box">
                                    <div className="textarea-wrap">
                                        <textarea
                                            value={seriesPrompt}
                                            onChange={e => setSeriesPrompt(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    generateSeries();
                                                }
                                            }}
                                            placeholder="Descreva a série de anime que você quer criar..."
                                            rows={5}
                                        />
                                    </div>
                                    <p className="input-hint">Pressione Enter para enviar · Shift+Enter para nova linha</p>
                                    <button className="btn-primary" onClick={generateSeries} disabled={!seriesPrompt.trim()}>
                                        ✦ &nbsp; Invocar a Visão da Série &nbsp; ✦
                                    </button>
                                </div>

                                <div className="examples-section">
                                    <p className="examples-label">✦ Exemplos</p>
                                    <div className="examples-grid">
                                        <button className="example-chip" onClick={() => setSeriesPrompt('Crie um anime isekai sobre um homem pobre determinado a ficar rico em sua nova vida.')}>Crie um anime isekai sobre um homem pobre determinado a ficar rico em sua nova vida.</button>
                                        <button className="example-chip" onClick={() => setSeriesPrompt('Crie uma série de anime de garotas mágicas sobre mulheres adultas trabalhadoras que se tornam garotas mágicas.')}>Crie uma série de anime de garotas mágicas sobre mulheres adultas trabalhadoras que se tornam garotas mágicas.</button>
                                        <button className="example-chip" onClick={() => setSeriesPrompt('Crie uma série de anime de comédia romântica sobre dois professores do ensino médio que estão namorando em segredo.')}>Crie uma série de anime de comédia romântica sobre dois professores do ensino médio que estão namorando em segredo.</button>
                                        <button className="example-chip" onClick={() => setSeriesPrompt('Ajude-me a ter ideias para uma série de anime cyberpunk.')}>Ajude-me a ter ideias para uma série de anime cyberpunk.</button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="screen-result fade-in">
                                {isGeneratingSeries && (
                                    <div className="loading-series">
                                        <div className="loading-runes">
                                            <span className="rune">⟁</span>
                                            <span className="rune">⟴</span>
                                            <span className="rune">⌘</span>
                                            <span className="rune">⟴</span>
                                            <span className="rune">⟁</span>
                                        </div>
                                        <p className="loading-text">Consultando os Pergaminhos Sagrados...</p>
                                    </div>
                                )}

                                {seriesError && !isGeneratingSeries && (
                                    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                                        <p style={{ fontFamily: 'var(--font-heading)', color: 'var(--red)', letterSpacing: '.2em', marginBottom: '16px' }}>✦ Erro ao Consultar os Pergaminhos ✦</p>
                                        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{seriesError}</p>
                                        <button className="btn-back" onClick={() => { setSeriesError(null); setSeriesResult(null); }}>← Tentar Novamente</button>
                                    </div>
                                )}

                                {seriesResult && !isGeneratingSeries && (
                                    <div className="result-content-series fade-in">
                                        <div className="series-header">
                                            <p className="series-title-label">Visão Geral da Série</p>
                                            <h2 className="series-title">{seriesResult.titulo || '—'}</h2>
                                            <p className="series-genre">{seriesResult.genero || '—'}</p>
                                        </div>

                                        <div className="ornament" style={{ marginBottom: '40px' }}>
                                            <div className="ornament-line"></div>
                                            <div className="ornament-diamond"></div>
                                            <div className="ornament-line"></div>
                                        </div>

                                        <div style={{ marginBottom: '16px' }}>
                                            <div className="result-card-s full-width">
                                                <span className="card-icon">✦</span>
                                                <p className="card-label">Logline</p>
                                                <p className="card-content">{seriesResult.logline || '—'}</p>
                                            </div>
                                        </div>

                                        <div className="result-grid-s">
                                            <div className="result-card-s">
                                                <span className="card-icon">📜</span>
                                                <p className="card-label">Visão Geral</p>
                                                <p className="card-content">{seriesResult.visao_geral || '—'}</p>
                                            </div>
                                            <div className="result-card-s">
                                                <span className="card-icon">🎨</span>
                                                <p className="card-label">Estética Visual</p>
                                                <p className="card-content">{seriesResult.estetica || '—'}</p>
                                            </div>
                                        </div>

                                        <div className="result-grid-s" style={{ marginBottom: '16px' }}>
                                            <div className="result-card-s">
                                                <span className="card-icon">⚡</span>
                                                <p className="card-label">Temas Principais</p>
                                                <div className="tags-list">
                                                    {(seriesResult.temas || []).map((t, idx) => (
                                                        <span key={idx} className="tag">{t}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="result-card-s">
                                                <span className="card-icon">🗺️</span>
                                                <p className="card-label">Premissa & Ambientação</p>
                                                <p className="card-content">{seriesResult.premissa || '—'}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="result-card-s full-width">
                                                <span className="card-icon">⚔️</span>
                                                <p className="card-label">Personagens Principais</p>
                                                <div className="chars-list">
                                                    {(seriesResult.personagens || []).map((c, idx) => (
                                                        <div key={idx} className="char-item">
                                                            <p className="char-name-s">{c.nome}</p>
                                                            <p className="char-role-s">{c.papel}</p>
                                                            <p className="char-desc">{c.descricao}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <button className="btn-back" onClick={() => { setSeriesResult(null); }}>← Nova Série</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="script-container fade-in">
                        {!scriptResult && !isGeneratingScript && !scriptError ? (
                            <div className="wrapper">
                                <header className="series-header-main" style={{ marginBottom: '20px' }}>
                                    <h1 className="font-title shimmer-text" style={{ fontSize: '2rem' }}>Agente de Roteiro</h1>
                                    <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '8px' }}>Construa o esqueleto narrativo completo do seu anime</p>
                                </header>

                                <div className="section-card">
                                    <div className="corner corner-tl"></div><div className="corner corner-tr"></div>
                                    <div className="corner corner-bl"></div><div className="corner corner-br"></div>
                                    <div className="section-title">✦ Identidade do Anime</div>

                                    <div className="config-grid">
                                        <div className="field-group full">
                                            <label>Título do Anime</label>
                                            <input type="text" value={arTitle} onChange={e => setArTitle(e.target.value)} placeholder="Ex: Sword Saint Reborn" />
                                        </div>
                                        <div className="field-group">
                                            <label>Subgênero</label>
                                            <select value={arGenre} onChange={e => setArGenre(e.target.value)}>
                                                <option value="classic">Clássico de Aventura</option>
                                                <option value="dark">Dark / Psicológico</option>
                                                <option value="op">Overpowered (OP)</option>
                                                <option value="harem">Harem</option>
                                                <option value="comedy">Comédia</option>
                                                <option value="guild">Guilda / Aventureiros</option>
                                                <option value="political">Político / Reinos</option>
                                                <option value="survival">Sobrevivência</option>
                                                <option value="slice">Slice of Life</option>
                                                <option value="dungeon">Dungeon / Tower</option>
                                                <option value="twist">Plot Twist Final</option>
                                                <option value="party">Party Fechada</option>
                                                <option value="villain">Vilão / Anti-herói</option>
                                                <option value="summoner">Invocação (Summoner)</option>
                                                <option value="experimental">Experimental</option>
                                            </select>
                                        </div>
                                        <div className="field-group">
                                            <label>Número de Episódios</label>
                                            <select value={arEpCount} onChange={e => setArEpCount(Number(e.target.value))}>
                                                <option value="6">6 episódios (OVA)</option>
                                                <option value="12">12 episódios</option>
                                                <option value="24">24 episódios</option>
                                            </select>
                                        </div>
                                        <div className="field-group full">
                                            <label>Premissa Inicial</label>
                                            <textarea value={arPremise} onChange={e => setArPremise(e.target.value)} placeholder="Ex: Um espadachim legendário é morto traiçoeiramente..." />
                                        </div>
                                        <div className="field-group">
                                            <label>Protagonista</label>
                                            <input type="text" value={arProtagonist} onChange={e => setArProtagonist(e.target.value)} placeholder="Nome do protagonista" />
                                        </div>
                                        <div className="field-group">
                                            <label>Tom Geral</label>
                                            <select value={arTone} onChange={e => setArTone(e.target.value)}>
                                                <option value="serious">Sério / Épico</option>
                                                <option value="balanced">Equilibrado</option>
                                                <option value="lighthearted">Leve / Divertido</option>
                                                <option value="dark">Sombrio / Psicológico</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="section-card">
                                    <div className="corner corner-tl"></div><div className="corner corner-tr"></div>
                                    <div className="corner corner-bl"></div><div className="corner corner-br"></div>
                                    <div className="episodes-header">
                                        <div className="section-title" style={{ marginBottom: 0 }}>✦ Personagens por Episódio</div>
                                        <div className="ep-count-badge">Total: {arEpisodesInput.reduce((acc, ep) => acc + ep.chars, 0)} personagens</div>
                                    </div>
                                    <div className="divider"><span>⟡</span></div>
                                    <div className="episodes-grid">
                                        {arEpisodesInput.map((ep, idx) => (
                                            <div key={idx} className="ep-card">
                                                <div className="ep-card-header">
                                                    <span className="ep-num">EP {String(ep.num).padStart(2, '0')}</span>
                                                    <span className="ep-chars-badge">+{ep.chars} pers.</span>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={ep.title}
                                                    onChange={e => {
                                                        const newEps = [...arEpisodesInput];
                                                        newEps[idx].title = e.target.value;
                                                        setArEpisodesInput(newEps);
                                                    }}
                                                    placeholder="Título do episódio"
                                                />
                                                <div className="ep-char-input">
                                                    <label>Personagens novos</label>
                                                    <input
                                                        type="number"
                                                        value={ep.chars}
                                                        onChange={e => {
                                                            const newEps = [...arEpisodesInput];
                                                            newEps[idx].chars = Number(e.target.value) || 0;
                                                            setArEpisodesInput(newEps);
                                                        }}
                                                        min="0" max="10"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="section-card">
                                    <div className="corner corner-tl"></div><div className="corner corner-tr"></div>
                                    <div className="corner corner-bl"></div><div className="corner corner-br"></div>
                                    <div className="section-title">✦ Diretrizes Narrativas</div>
                                    <div className="config-grid">
                                        <div className="field-group">
                                            <label>Conflito Principal</label>
                                            <select value={arConflict} onChange={e => setArConflict(e.target.value)}>
                                                <option value="external">Externo (guerra, vilão)</option>
                                                <option value="internal">Interno (identidade)</option>
                                                <option value="both">Ambos (dual)</option>
                                            </select>
                                        </div>
                                        <div className="field-group">
                                            <label>Foco do Episódio Padrão</label>
                                            <select value={arFocus} onChange={e => setArFocus(e.target.value)}>
                                                <option value="protagonist">Protagonista sempre</option>
                                                <option value="rotating">Rotativo entre personagens</option>
                                                <option value="ensemble">Ensemble (grupo)</option>
                                            </select>
                                        </div>
                                        <div className="field-group full">
                                            <label>Antagonista Principal</label>
                                            <input type="text" value={arAntagonist} onChange={e => setArAntagonist(e.target.value)} placeholder="Nome e breve descrição do vilão principal" />
                                        </div>
                                        <div className="field-group full">
                                            <label>Elementos obrigatórios na temporada</label>
                                            <textarea value={arMustHave} onChange={e => setArMustHave(e.target.value)} placeholder="Ex: traição de aliado, revelação de poder oculto..." />
                                        </div>
                                    </div>
                                </div>

                                <div className="section-card" style={{ padding: '24px 36px', textAlign: 'center' }}>
                                    <div className="corner corner-tl"></div><div className="corner corner-tr"></div>
                                    <div className="corner corner-bl"></div><div className="corner corner-br"></div>
                                    <button className="btn-generate btn-ar" onClick={generateScript} disabled={!arTitle.trim()}>
                                        <span className="btn-icon">⚔</span>
                                        &nbsp;INVOCAR O AGENTE DE ROTEIRO&nbsp;
                                        <span className="btn-icon">⚔</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="screen-result fade-in">
                                {isGeneratingScript && (
                                    <div className="loading-series">
                                        <div className="loading-runes">
                                            <span className="rune">⟁</span>
                                            <span className="rune">⟴</span>
                                            <span className="rune">⌘</span>
                                            <span className="rune">⟴</span>
                                            <span className="rune">⟁</span>
                                        </div>
                                        <p className="loading-text">INVOCANDO O GRIMÓRIO...</p>
                                    </div>
                                )}

                                {scriptError && !isGeneratingScript && (
                                    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                                        <p style={{ fontFamily: 'var(--font-heading)', color: 'var(--red)', letterSpacing: '.2em', marginBottom: '16px' }}>✦ Erro ao Consultar os Pergaminhos ✦</p>
                                        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{scriptError}</p>
                                        <button className="btn-back" onClick={() => { setScriptError(null); setScriptResult(null); }}>← Tentar Novamente</button>
                                    </div>
                                )}

                                {scriptResult && !isGeneratingScript && (
                                    <div className="wrapper">
                                        <div className="section-card">
                                            <div className="corner corner-tl"></div><div className="corner corner-tr"></div>
                                            <div className="corner corner-bl"></div><div className="corner corner-br"></div>
                                            <div className="section-title">✦ Sinopse Geral</div>
                                            <div className="synopsis-text">{scriptResult.sinopseGeral}</div>
                                        </div>

                                        <div className="section-card">
                                            <div className="corner corner-tl"></div><div className="corner corner-tr"></div>
                                            <div className="corner corner-bl"></div><div className="corner corner-br"></div>
                                            <div className="section-title">✦ Checklist do Agente</div>
                                            <div className="checklist">
                                                {scriptResult.checklist_narrativo.map((c, i) => (
                                                    <div key={i} className="check-item">
                                                        <span className="check-icon">{c.ok ? '✅' : '⚠️'}</span>
                                                        <span>{c.texto}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="section-card">
                                            <div className="corner corner-tl"></div><div className="corner corner-tr"></div>
                                            <div className="corner corner-bl"></div><div className="corner corner-br"></div>
                                            <div className="section-title">✦ Resumo por Episódio</div>
                                            <div className="ep-results-grid">
                                                {scriptResult.episodios.map((ep, i) => (
                                                    <div key={i} className="ep-result" onClick={() => setExpandedEp(expandedEp === ep.numero ? null : ep.numero)} style={{ cursor: 'pointer' }}>
                                                        <div className="ep-result-header">
                                                            <div className="ep-result-title">Episódio {String(ep.numero).padStart(2, '0')} — {ep.titulo}</div>
                                                        </div>
                                                        <div className="ep-result-summary">{ep.resumo}</div>

                                                        {expandedEp === ep.numero && (
                                                            <div className="ep-result-acts fade-in">
                                                                <div className="act-block">
                                                                    <div className="act-label">Início</div>
                                                                    <div className="act-content">{ep.atos?.inicio || '—'}</div>
                                                                </div>
                                                                <div className="act-block">
                                                                    <div className="act-label">Meio</div>
                                                                    <div className="act-content">{ep.atos?.meio || '—'}</div>
                                                                </div>
                                                                <div className="act-block">
                                                                    <div className="act-label">Fim</div>
                                                                    <div className="act-content">{ep.atos?.fim || '—'}</div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="ep-expand-hint">{expandedEp === ep.numero ? '▲ recolher' : '▼ expandir atos'}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="section-card">
                                            <div className="corner corner-tl"></div><div className="corner corner-tr"></div>
                                            <div className="corner corner-bl"></div><div className="corner corner-br"></div>
                                            <div className="section-title">✦ Registro de Personagens</div>
                                            <div className="chars-grid">
                                                {scriptResult.personagens_destacados.map((c, i) => (
                                                    <div key={i} className="char-card">
                                                        <div className="char-ep-tag">Ep. {String(c.episodio_introducao).padStart(2, '0')}</div>
                                                        <div className="char-name-s">{c.nome}</div>
                                                        <div className="char-role-s">{c.papel}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <button className="btn-back" onClick={() => { setScriptResult(null); }}>← Novo Roteiro</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="grimoire-container v2 fade-in">
                        <header className="grimoire-header">
                            <div className="grimoire-title">Umbra Cenas V2</div>
                            <div className="grimoire-subtitle">⸻ Arquiteto de Episódios Cinematográficos ⸻</div>
                        </header>
                        <div className="v2-layout-wrapper">
                            <div className="v2-migration-notice panel-card fade-in" style={{ textAlign: 'center', padding: '60px 20px' }}>
                                <div className="corner tl"></div><div className="corner tr"></div>
                                <div className="corner bl"></div><div className="corner br"></div>
                                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🔶</div>
                                <h2 className="font-title" style={{ color: 'var(--gold-light)' }}>Umbra Cenas V2</h2>
                                <p style={{ maxWidth: '600px', margin: '0 auto 30px', color: 'var(--text-secondary)' }}>
                                    O **Arquiteto de Episódios** foi promovido! Agora ele possui seu próprio santuário na sidebar principal para uma experiência mais imersiva e profissional.
                                </p>
                                <div className="migration-shortcuts" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', maxWidth: '800px', margin: '0 auto' }}>
                                    <div className="shortcut-card">
                                        <strong>🎬 Umbra Cenas</strong>
                                        <p>Geração completa de roteiros</p>
                                    </div>
                                    <div className="shortcut-card">
                                        <strong>✍️ Prompts Cenas</strong>
                                        <p>Prompts técnicos para VEO3</p>
                                    </div>
                                </div>
                                <p style={{ marginTop: '40px', fontSize: '0.9rem', color: 'var(--gold-dark)', fontWeight: 'bold' }}>
                                    Acesso liberado através da "ETAPA 2: CENAS" no menu lateral.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {currentStep > 3 && (
                    <div className="placeholder-step panel-card fade-in">
                        <div className="card-icon">✨</div>
                        <h2 className="font-title">{STEPS[currentStep]}</h2>
                        <p>O feitiço para esta etapa ainda está sendo conjurado...</p>
                        <p className="loading-sub">Em breve no Umbra Lab.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
