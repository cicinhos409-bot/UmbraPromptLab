import React, { useState, useRef, useCallback } from 'react';
import type { AppSettings } from '../../types/prompt';
import './IsekaiPlanner.css';

/* ───────────────────────────────── Types ───────────────────────────────── */
interface QA { pergunta: string; resposta: string }
interface Secao { titulo: string; emoji: string; qas: QA[] }
interface FichaData { contexto: Contexto; secoes: Secao[] }
interface Contexto {
    nome: string; genero: string; estilo: string;
    ideia: string; tom: string; poder: string;
}

/* ──────────────────────────────── Sections ─────────────────────────────── */
const SECOES: { emoji: string; titulo: string; dica: string; perguntas: string[] }[] = [
    {
        emoji: '🎭', titulo: 'História & Roteiro',
        dica: 'Defina as regras antes de criar as cenas — um sistema inconsistente confunde o público.',
        perguntas: [
            'Qual é a premissa principal? Como o protagonista foi parar nesse outro mundo?',
            'Qual é o poder especial do protagonista e como ele foi adquirido?',
            'Qual é a penalidade ou custo desse poder? (ex: memórias, vida útil, emoções)',
            'Quais são as regras do mundo? Existem níveis, classes e skills?',
            'Como funciona o sistema de magia? Tem elementos, palavras de ativação, gestos?',
            'Qual é o conflito principal do primeiro episódio?',
            'Existe uma organização vilã ou antagonista já estabelecida desde o início?',
            'Como funciona a economia e a política do mundo? Existem reinos, guildas, facções?',
            'Quais são os limites do poder do protagonista? O que ele NÃO pode fazer?',
            'Qual é o cliffhanger do primeiro episódio para prender o espectador?',
        ],
    },
    {
        emoji: '👤', titulo: 'Personagens',
        dica: 'Personagens com designs simples são muito mais fáceis de animar consistentemente.',
        perguntas: [
            'Qual é o design completo do protagonista? (cor de cabelo, roupa, estatura, traços marcantes)',
            'Ele terá uma guia ou voz? Qual é a personalidade dela?',
            'Qual será o mascote ou monstro companheiro? Qual sua forma e habilidade principal?',
            'Quais expressões faciais são essenciais para cada personagem principal? (liste as 5 principais)',
            'Você tem as fichas de personagem (frente, costas e lado) com cores exatas definidas?',
            'Qual é o arquétipo de cada personagem? (ex: herói inocente, mentor sábio, rival arrogante)',
            'Como os personagens secundários se diferenciam visualmente do protagonista?',
            'Quais personagens aparecem só neste episódio e quais serão recorrentes?',
            'Quais são as falas/bordões que definem cada personagem?',
            'Os figurantes terão designs únicos ou serão versões simplificadas e repetidas?',
        ],
    },
    {
        emoji: '🎬', titulo: 'Produção Visual',
        dica: 'Reutilizar cenários com pequenas mudanças de iluminação pode economizar até 60% do tempo.',
        perguntas: [
            'Vai usar animação 2D, 3D ou combinação? Qual estilo predomina?',
            'Quais cenários precisam ser criados do zero e quais podem ser reutilizados?',
            'Quais cenas usam apenas imagens estáticas com câmera se movendo?',
            'Quais momentos precisam de VFX especiais? (magia, interfaces, partículas, explosões)',
            'Qual será a paleta de cores para cada hora do dia? (manhã, tarde, noite, entardecer)',
            'Quantos frames por segundo (FPS) sua animação terá?',
            'Quais cenas usarão Parallax (camadas de fundo em velocidades diferentes)?',
            'Como serão os ciclos de animação repetidos? (caminhada, respiração, cabelo ao vento)',
            'Quais cenas utilizam Squash and Stretch para dar vida aos monstros?',
            'Haverá cenas com câmera em movimento complexo (dolly, tracking, zoom dramático)?',
        ],
    },
    {
        emoji: '🖥️', titulo: 'Interface (UI) — Menus e Sistema',
        dica: 'Crie os menus como imagens PNG transparentes reutilizáveis — use uma vez em todas as cenas.',
        perguntas: [
            'Como será o design dos menus de status do personagem? (estilo, cores, bordas)',
            'Quais informações aparecem na tela de status? (HP, MP, Rank, EXP, Skills, Classe)',
            'Qual o estilo visual das interfaces — pergaminho medieval, futurista, holográfico?',
            'Os menus têm sons de abertura/fechamento? Qual é o estilo sonoro?',
            'As interfaces têm animação de entrada quando aparecem na tela?',
            'Os menus aparecem sempre no mesmo lugar da tela ou mudam de posição?',
            'Existem diferentes telas dentro do menu? (inventário, mapa, skills, missões)',
            'Como o protagonista interage com o menu? (toque no ar, voz, gesto)',
            'Haverá notificações ou alertas do sistema? Como eles aparecerão?',
            'Os menus são visíveis apenas para o protagonista ou outros personagens também veem?',
        ],
    },
    {
        emoji: '🔊', titulo: 'Áudio — Dublagem, SFX e Trilha',
        dica: 'O monólogo interno elimina a necessidade de Lip Sync e poupa horas de animação.',
        perguntas: [
            'Quem vai dublar cada personagem? Há vozes disponíveis ou será síntese de voz?',
            'Quais efeitos sonoros (SFX) cada cena exige? (passos, espadas, magia, ambiente)',
            'Qual o estilo da trilha sonora para cada tipo de cena? (batalha, cidade, mistério)',
            'A voz do guia terá algum filtro especial? (eco, estéreo, reverb, voz etérea)',
            'Você tem banco de sons royalty free ou vai criar os próprios efeitos?',
            'A abertura (OP) e o encerramento (ED) já estão definidos? Qual estilo musical?',
            'Os personagens terão sons de reação (grunhidos, suspiros, risos) além das falas?',
            'Como será feito o Lip Sync? (animação labial sincronizada ou estilo boca de aba?)',
            'Haverá narração em off? Em quais cenas e com qual tom de voz?',
            'Qual software será usado para editar e mixar o áudio final?',
        ],
    },
    {
        emoji: '🛠️', titulo: 'Ferramentas e Pipeline',
        dica: 'Defina o pipeline completo ANTES de começar — mudar de software no meio causa perda de trabalho.',
        perguntas: [
            'Qual software de animação 2D vai usar? (OpenToonz, Krita, Clip Studio EX, Toon Boom)',
            'Vai usar Blender para cenários ou monstros 3D com Cel Shading?',
            'Qual software de composição usará para juntar tudo? (DaVinci, After Effects)',
            'Qual software para design de personagens? (Photoshop, Procreate, Krita)',
            'Você trabalha sozinho ou tem equipe? Quem é responsável por cada parte?',
            'Qual é o hardware disponível? (tablet gráfico, processador, placa de vídeo)',
            'Como será feito o controle de versão dos arquivos? (backup, nomeação, organização)',
            'Qual é o prazo estimado para o primeiro episódio ficar pronto?',
            'Você vai usar assets prontos ou criar tudo do zero?',
            'Qual plataforma usará para publicar o anime? (YouTube, Crunchyroll, redes sociais)',
        ],
    },
    {
        emoji: '📋', titulo: 'Storyboard e Cenas',
        dica: 'O animatic (storyboard com áudio temporário) é o passo mais importante — mostra problemas antes de animar.',
        perguntas: [
            'Você já tem o storyboard de todas as cenas do primeiro episódio desenhado?',
            'Qual é a duração planejada de cada cena? (em segundos ou minutos)',
            'Quais cenas serão animadas com mais detalhe e quais usarão animação mínima?',
            'Como será feita a transição entre as cenas? (corte seco, fade, wipe, dissolve)',
            'Existe uma cena de abertura (cold open) para prender o espectador nos primeiros 30s?',
            'Quais ângulos de câmera serão usados em cada cena? (plano geral, close, POV)',
            'Haverá cenas de ação que exigem Impact Frames ou Smear Frames?',
            'Existe alguma cena que pode ser resolvida apenas com imagem estática + áudio + voz off?',
            'Como o ritmo do episódio vai variar? (cenas lentas intercaladas com ação)',
            'Quais cenas podem reutilizar assets já criados para economizar tempo?',
        ],
    },
];

const TOTAL_PERGUNTAS = SECOES.reduce((acc, s) => acc + s.perguntas.length, 0);

/* ───────────────────────── Component ───────────────────────── */
interface IsekaiPlannerProps { settings: AppSettings }

interface QAState { pergunta: string; resposta: string; done: boolean }
interface SecaoState { titulo: string; emoji: string; dica: string; qas: QAState[]; visible: boolean }

export const IsekaiPlanner: React.FC<IsekaiPlannerProps> = ({ settings }) => {
    // ── Setup form ──
    const [nome, setNome] = useState('');
    const [genero, setGenero] = useState('masculino');
    const [estilo, setEstilo] = useState('anime 2D clássico');
    const [ideia, setIdeia] = useState('');
    const [tom, setTom] = useState('épico e sério');
    const [poder, setPoder] = useState('sistema de RPG único');

    // ── Run state ──
    const [running, setRunning] = useState(false);
    const [done, setDone] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState('Iniciando ritual de criação...');
    const [secoes, setSecoes] = useState<SecaoState[]>([]);
    const fichaRef = useRef<FichaData | null>(null);
    const abortRef = useRef(false);

    const updateQA = useCallback((si: number, qi: number, partial: string, isDone = false) => {
        setSecoes(prev => {
            const next = prev.map((s, i) => i !== si ? s : {
                ...s,
                qas: s.qas.map((q, j) => j !== qi ? q : { ...q, resposta: partial, done: isDone }),
            });
            return next;
        });
    }, []);

    const callMistral = async (systemPrompt: string, pergunta: string): Promise<string> => {
        const resp = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
            body: JSON.stringify({
                model: 'mistral-large-latest',
                max_tokens: 350,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: pergunta },
                ],
            }),
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error((err as { message?: string }).message ?? `Erro ${resp.status}`);
        }
        const data = await resp.json() as { choices: { message: { content: string } }[] };
        return data.choices[0].message.content.trim();
    };

    const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

    const iniciar = async () => {
        if (!settings.apiKey) { alert('Configure sua API Key Mistral nas Configurações (⚙).'); return; }
        abortRef.current = false;
        setDone(false);
        setProgress(0);
        setProgressLabel('Invocando o grimório do multiverso...');

        const ctx: Contexto = {
            nome: nome.trim() || 'Mundo Sem Nome',
            genero, estilo, ideia: ideia.trim(), tom, poder,
        };

        const systemPrompt = `Você é um diretor criativo especialista em produção de anime isekai.
Você está ajudando a planejar um anime chamado "${ctx.nome}".
Tom da história: ${ctx.tom}. Estilo visual: ${ctx.estilo}.
Gênero do protagonista: ${ctx.genero}. Poder especial: ${ctx.poder}.
Ideia do criador: ${ctx.ideia || 'não especificada — crie algo original e criativo'}.

Responda de forma criativa, específica e detalhada. Use nomes próprios, cores específicas,
personalidades únicas. Seja um roteirista e diretor de arte real respondendo com expertise.
Responda APENAS a resposta direta, sem repetir a pergunta, sem introdução.
Máximo 3 frases concisas e ricas em detalhe. Responda em Português do Brasil.`;

        // initialise state
        const initial: SecaoState[] = SECOES.map(s => ({
            titulo: s.titulo, emoji: s.emoji, dica: s.dica, visible: false,
            qas: s.perguntas.map(p => ({ pergunta: p, resposta: '', done: false })),
        }));
        setSecoes(initial);
        setRunning(true);

        fichaRef.current = { contexto: ctx, secoes: [] };
        let respondidas = 0;

        try {
            for (let si = 0; si < SECOES.length; si++) {
                if (abortRef.current) break;
                // reveal section
                setSecoes(prev => prev.map((s, i) => i === si ? { ...s, visible: true } : s));
                await sleep(80);

                const sec = SECOES[si];
                const secQAs: QA[] = [];

                for (let qi = 0; qi < sec.perguntas.length; qi++) {
                    if (abortRef.current) break;
                    const pergunta = sec.perguntas[qi];
                    setProgressLabel(`${sec.emoji} ${sec.titulo} — Pergunta ${qi + 1}/${sec.perguntas.length}...`);

                    let resposta = '';
                    try {
                        resposta = await callMistral(systemPrompt, pergunta);
                    } catch (err) {
                        resposta = err instanceof Error ? `⚠️ ${err.message}` : '⚠️ Erro inesperado';
                    }

                    // typewriter
                    for (let c = 0; c <= resposta.length; c++) {
                        if (abortRef.current) break;
                        updateQA(si, qi, resposta.slice(0, c), c === resposta.length);
                        if (c < resposta.length) await sleep(12);
                    }

                    secQAs.push({ pergunta, resposta });
                    respondidas++;
                    setProgress(Math.round((respondidas / TOTAL_PERGUNTAS) * 100));
                }

                fichaRef.current.secoes.push({ titulo: sec.titulo, emoji: sec.emoji, qas: secQAs });
            }
        } finally {
            setRunning(false);
            if (!abortRef.current) {
                setProgressLabel(`✦ Planejamento completo! ${TOTAL_PERGUNTAS} perguntas respondidas ✦`);
                setProgress(100);
                setDone(true);
            }
        }
    };

    const reiniciar = () => {
        abortRef.current = true;
        setRunning(false);
        setDone(false);
        setProgress(0);
        setProgressLabel('Iniciando ritual de criação...');
        setSecoes([]);
        fichaRef.current = null;
    };

    const exportarTexto = () => {
        const ficha = fichaRef.current;
        if (!ficha) return;
        let txt = `PLANEJAMENTO DE ANIME ISEKAI\n${ficha.contexto.nome.toUpperCase()}\n${'='.repeat(50)}\n\n`;
        for (const sec of ficha.secoes) {
            txt += `${sec.emoji} ${sec.titulo.toUpperCase()}\n${'─'.repeat(40)}\n`;
            sec.qas.forEach((qa, i) => { txt += `\n${i + 1}. ${qa.pergunta}\n→ ${qa.resposta}\n`; });
            txt += '\n';
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }));
        a.download = `planejamento-${ficha.contexto.nome.replace(/\s+/g, '-').toLowerCase()}.txt`;
        a.click();
    };

    const showContent = running || done;

    return (
        <div className="ip-wrap">
            {/* ── Header ── */}
            <div className="ip-header">
                <div className="ip-pre-title">✦ Estúdio de Criação ✦</div>
                <h2 className="ip-h1">Planejador de Anime<br />Isekai com IA</h2>
                <p className="ip-sub">Responda o básico — a IA cria o resto</p>
                <div className="ip-divider" />
            </div>

            {/* ── Setup form ── */}
            {!showContent && (
                <div className="ip-setup">
                    <div className="ip-card">
                        <h3 className="ip-card-title">Sua Ideia Inicial</h3>
                        <div className="ip-field-full">
                            <label className="ip-label">Nome do seu anime</label>
                            <input className="ip-input" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Código de Outro Mundo" />
                        </div>
                        <div className="ip-field-grid">
                            <div>
                                <label className="ip-label">Gênero do protagonista</label>
                                <select className="ip-select" value={genero} onChange={e => setGenero(e.target.value)}>
                                    <option value="masculino">Masculino</option>
                                    <option value="feminino">Feminino</option>
                                    <option value="não-binário">Não-binário</option>
                                </select>
                            </div>
                            <div>
                                <label className="ip-label">Estilo visual</label>
                                <select className="ip-select" value={estilo} onChange={e => setEstilo(e.target.value)}>
                                    <option value="anime 2D clássico">Anime 2D Clássico</option>
                                    <option value="anime 3D cel-shaded">3D Cel-Shaded</option>
                                    <option value="pixel art animado">Pixel Art</option>
                                    <option value="misto 2D/3D">Misto 2D/3D</option>
                                </select>
                            </div>
                        </div>
                        <div className="ip-field-full">
                            <label className="ip-label">Descreva sua ideia em 2–3 frases</label>
                            <textarea className="ip-textarea" value={ideia} onChange={e => setIdeia(e.target.value)} placeholder="Ex: Um programador morre e acorda num mundo onde código de computador virou magia. Ele descobre que pode 'debugar' feitiços e reescrever o sistema mágico..." />
                            <p className="ip-hint">Deixe em branco para a IA criar tudo do zero!</p>
                        </div>
                        <div className="ip-field-grid">
                            <div>
                                <label className="ip-label">Tom da história</label>
                                <select className="ip-select" value={tom} onChange={e => setTom(e.target.value)}>
                                    <option value="épico e sério">Épico e Sério</option>
                                    <option value="aventura leve e divertido">Aventura Leve</option>
                                    <option value="sombrio e maduro">Sombrio e Maduro</option>
                                    <option value="comédia isekai">Comédia</option>
                                    <option value="romance e aventura">Romance + Aventura</option>
                                </select>
                            </div>
                            <div>
                                <label className="ip-label">Poder especial do protagonista</label>
                                <select className="ip-select" value={poder} onChange={e => setPoder(e.target.value)}>
                                    <option value="sistema de RPG único">Sistema RPG Único</option>
                                    <option value="magia proibida">Magia Proibida</option>
                                    <option value="habilidade de análise suprema">Análise Suprema</option>
                                    <option value="poder de recriar habilidades">Cópia de Habilidades</option>
                                    <option value="invocação de exércitos">Invocação</option>
                                    <option value="manipulação do tempo">Manipulação do Tempo</option>
                                    <option value="criação de itens lendários">Criação de Itens</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="ip-gen-wrap">
                        <button className="ip-gen-btn" onClick={iniciar}>
                            <span className="ip-btn-icon">⚙</span>
                            Gerar Planejamento Completo
                        </button>
                    </div>
                </div>
            )}

            {/* ── Progress bar ── */}
            {showContent && (
                <div className="ip-progress-wrap">
                    <div className="ip-progress-header">Construindo seu universo...</div>
                    <div className="ip-progress-bg">
                        <div className="ip-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="ip-progress-label">{progressLabel}</div>
                </div>
            )}

            {/* ── Sections output ── */}
            {showContent && (
                <div className="ip-output">
                    {secoes.map((sec, si) => sec.visible && (
                        <div key={si} className="ip-section">
                            <div className="ip-sec-header">
                                <span className="ip-sec-emoji">{sec.emoji}</span>
                                <span className="ip-sec-title">{sec.titulo}</span>
                                <span className="ip-sec-count">
                                    {sec.qas.filter(q => q.done).length} / {sec.qas.length}
                                </span>
                            </div>
                            <div className="ip-qa-list">
                                {sec.qas.map((qa, qi) => (
                                    qa.resposta !== '' || (running && si === secoes.findIndex((_, i) => secoes[i]?.visible && !secoes[i].qas[qi]?.done)) ? (
                                        <div key={qi} className="ip-qa-item">
                                            <div className="ip-question">
                                                <span className="ip-qnum">{qi + 1}.</span>
                                                <span className="ip-qtext">{qa.pergunta}</span>
                                            </div>
                                            <div className="ip-answer">
                                                {qa.resposta}
                                                {!qa.done && qa.resposta !== '' && <span className="ip-cursor" />}
                                                {!qa.done && qa.resposta === '' && <span className="ip-cursor" />}
                                            </div>
                                        </div>
                                    ) : null
                                ))}
                            </div>
                            <div className="ip-tip-box">💡 {sec.dica}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Export bar ── */}
            {done && (
                <div className="ip-export-wrap">
                    <div className="ip-divider" />
                    <button className="ip-export-btn" onClick={exportarTexto}>📄 Exportar como Texto</button>
                    <button className="ip-export-btn" onClick={() => window.print()}>🖨️ Imprimir / PDF</button>
                    <button className="ip-export-btn" onClick={reiniciar}>🔄 Criar Novo Anime</button>
                </div>
            )}

            {/* Abort if running */}
            {running && (
                <div className="ip-export-wrap">
                    <button className="ip-export-btn ip-abort" onClick={reiniciar}>✕ Cancelar</button>
                </div>
            )}
        </div>
    );
};
