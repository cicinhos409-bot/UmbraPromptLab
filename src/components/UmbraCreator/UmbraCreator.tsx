import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { AppSettings } from '../../types/prompt';
import { callMistralProxy } from '../../services/mistralProxy';
import './UmbraCreator.css';

interface UmbraCreatorProps {
    settings: AppSettings | null;
}

interface Answer { section: string; question: string; answer: string; }
interface ChatMsg { id: string; html: string; isUser: boolean; }

let _id = 0;
const nid = () => `uc-${++_id}`;

const QUESTIONS = [
    // História & Roteiro
    { section: '🎭 HISTÓRIA & ROTEIRO', q: 'Qual é a premissa principal do seu anime? Como seu personagem foi parar nesse outro mundo?' },
    { section: '🎭 HISTÓRIA & ROTEIRO', q: 'Qual é o poder especial do protagonista e como ele foi adquirido?' },
    { section: '🎭 HISTÓRIA & ROTEIRO', q: 'Qual é a penalidade ou custo desse poder? (ex: memórias, vida útil, emoções)' },
    { section: '🎭 HISTÓRIA & ROTEIRO', q: 'Quais são as regras do seu mundo? Existem níveis, classes e skills?' },
    { section: '🎭 HISTÓRIA & ROTEIRO', q: 'Como funciona o sistema de magia? Tem elementos, palavras de ativação, gestos?' },
    { section: '🎭 HISTÓRIA & ROTEIRO', q: 'Qual é o conflito principal do primeiro episódio? O que o protagonista precisa resolver?' },
    { section: '🎭 HISTÓRIA & ROTEIRO', q: 'Existe uma organização vilã ou antagonista já estabelecida desde o início?' },
    { section: '🎭 HISTÓRIA & ROTEIRO', q: 'Como funciona a economia e a política do mundo? Existem reinos, guildas, facções?' },
    { section: '🎭 HISTÓRIA & ROTEIRO', q: 'Quais são os limites do poder do protagonista? O que ele NÃO pode fazer?' },
    { section: '🎭 HISTÓRIA & ROTEIRO', q: 'Qual é o gancho final (cliffhanger) do primeiro episódio para prender o espectador?' },
    // Personagens
    { section: '👤 PERSONAGENS', q: 'Qual é o design completo do protagonista? (cor de cabelo, roupa, estatura, traços marcantes)' },
    { section: '👤 PERSONAGENS', q: 'Ele terá uma "guia" invisível/voz? Qual é a personalidade dela?' },
    { section: '👤 PERSONAGENS', q: 'Qual será o mascote ou monstro companheiro? Qual sua forma e habilidade principal?' },
    { section: '👤 PERSONAGENS', q: 'Quais expressões faciais são essenciais para cada personagem principal? (liste as 5 principais)' },
    { section: '👤 PERSONAGENS', q: 'Qual é o arquétipo de cada personagem? (ex: herói inocente, mentor sábio, rival arrogante)' },
    { section: '👤 PERSONAGENS', q: 'Como os personagens secundários se diferenciam visualmente do protagonista?' },
    { section: '👤 PERSONAGENS', q: 'Quais personagens aparecem só neste episódio e quais serão recorrentes na série?' },
    { section: '👤 PERSONAGENS', q: 'Quais são as falas/bordões que definem a personalidade de cada personagem?' },
    // Produção Visual
    { section: '🎬 PRODUÇÃO VISUAL', q: 'Vai usar animação 2D, 3D ou uma combinação? Qual estilo predomina?' },
    { section: '🎬 PRODUÇÃO VISUAL', q: 'Quais cenários precisam ser criados do zero e quais podem ser reutilizados entre cenas?' },
    { section: '🎬 PRODUÇÃO VISUAL', q: 'Quais momentos precisam de VFX especiais? (magia, interfaces, partículas, explosões)' },
    { section: '🎬 PRODUÇÃO VISUAL', q: 'Qual será a paleta de cores para cada hora do dia? (manhã, tarde, noite, entardecer)' },
    { section: '🎬 PRODUÇÃO VISUAL', q: 'Quantos frames por segundo (FPS) sua animação terá? (12fps é padrão de anime)' },
    // Interface UI
    { section: '🖥️ INTERFACE (UI)', q: 'Como será o design dos menus de status do personagem? (estilo, cores, bordas)' },
    { section: '🖥️ INTERFACE (UI)', q: 'Qual o estilo visual das interfaces — pergaminho medieval, futurista, digital, holográfico?' },
    { section: '🖥️ INTERFACE (UI)', q: 'Como o protagonista interage com o menu? (toque no ar, voz, piscar de olhos, gesto)' },
    { section: '🖥️ INTERFACE (UI)', q: 'Haverá notificações ou alertas do sistema? Como eles aparecerão na tela?' },
    // Áudio
    { section: '🔊 ÁUDIO', q: 'Quem vai dublar cada personagem principal? Você tem acesso a vozes ou vai usar síntese de voz?' },
    { section: '🔊 ÁUDIO', q: 'Qual o estilo da trilha sonora para cada tipo de cena? (batalha, cidade, descanso, mistério)' },
    { section: '🔊 ÁUDIO', q: 'A abertura (OP) e o encerramento (ED) já estão definidos? Qual estilo musical?' },
    { section: '🔊 ÁUDIO', q: 'Como será feito o Lip Sync? (animação labial ou estilo "boca de aba"?)' },
    // Ferramentas
    { section: '🛠️ FERRAMENTAS & PIPELINE', q: 'Qual software de animação 2D vai usar? (OpenToonz, Krita, Clip Studio EX, Toon Boom...)' },
    { section: '🛠️ FERRAMENTAS & PIPELINE', q: 'Qual software de composição/efeitos usará para juntar tudo? (DaVinci Resolve, After Effects...)' },
    { section: '🛠️ FERRAMENTAS & PIPELINE', q: 'Você trabalha sozinho ou tem uma equipe? Quem é responsável por cada parte do pipeline?' },
    { section: '🛠️ FERRAMENTAS & PIPELINE', q: 'Qual plataforma usará para publicar o anime? (YouTube, Crunchyroll, redes sociais)' },
    // Orçamento
    { section: '💰 ORÇAMENTO & RECURSOS', q: 'Qual é o orçamento total disponível para produzir o primeiro episódio?' },
    { section: '💰 ORÇAMENTO & RECURSOS', q: 'Quantas horas por semana você (e a equipe) conseguem dedicar à produção?' },
    { section: '💰 ORÇAMENTO & RECURSOS', q: 'Existe um plano para monetizar o anime? (YouTube AdSense, Patreon, merchandise)' },
    { section: '💰 ORÇAMENTO & RECURSOS', q: 'Qual é o prazo estimado para o primeiro episódio ficar pronto?' },
];

const SECTION_COLORS: Record<string, string> = {
    '🎭 HISTÓRIA & ROTEIRO': '#8b1a1a',
    '👤 PERSONAGENS': '#1a3a6b',
    '🎬 PRODUÇÃO VISUAL': '#1a5c2a',
    '🖥️ INTERFACE (UI)': '#5c3a00',
    '🔊 ÁUDIO': '#3a1a5c',
    '🛠️ FERRAMENTAS & PIPELINE': '#1a4a4a',
    '💰 ORÇAMENTO & RECURSOS': '#4a3a00',
};

async function callCreatorMistral(messages: { role: string; content: string }[]): Promise<string> {
    const systemPrompt = `Você é um assistente especialista em produção de anime, especialmente isekai. Sua função é guiar o usuário por perguntas para criar seu anime. Após cada resposta dê um comentário construtivo curto (1-2 frases), elogie ou dê uma dica, então aguarde a próxima pergunta do sistema. Seja entusiasmado, direto, em português brasileiro.`;
    return callMistralProxy({
        model: 'mistral-small-latest',
        max_tokens: 300,
        temperature: 0.7,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
    });
}

export const UmbraCreator: React.FC<UmbraCreatorProps> = () => {
    const [msgs, setMsgs] = useState<ChatMsg[]>([]);
    const [answers, setAnswers] = useState<Record<number, Answer>>({});
    const [currentQ, setCurrentQ] = useState(-1);
    const [typing, setTyping] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [input, setInput] = useState('');
    const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
    const [done, setDone] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    const qRef = useRef(currentQ);
    const enabledRef = useRef(enabled);

    useEffect(() => { qRef.current = currentQ; }, [currentQ]);
    useEffect(() => { enabledRef.current = enabled; }, [enabled]);
    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, typing]);

    const addMsg = useCallback((html: string, isUser = false) =>
        setMsgs(prev => [...prev, { id: nid(), html, isUser }]), []);

    const askQuestion = useCallback((idx: number) => {
        setCurrentQ(idx); qRef.current = idx;
        if (idx >= QUESTIONS.length) {
            setDone(true); setEnabled(false);
            addMsg(`<div class="uc-section-tag" style="background:var(--gold-dark);color:var(--ink)">✅ CONCLUÍDO</div><br/><strong>Parabéns!</strong> Você completou todas as ${QUESTIONS.length} perguntas do Umbra Creator!<br/><br/>Clique em <strong>"Ver Resumo"</strong> para ver o plano completo do seu anime.`);
            return;
        }
        const q = QUESTIONS[idx];
        const prevSec = idx > 0 ? QUESTIONS[idx - 1].section : null;
        const showSec = q.section !== prevSec;
        const color = SECTION_COLORS[q.section] || 'var(--gold-dark)';
        setEnabled(false);
        setTimeout(() => {
            setTyping(true);
            setTimeout(() => {
                setTyping(false);
                const secHtml = showSec ? `<div class="uc-section-tag" style="background:${color}">${q.section}</div><br/>` : '';
                addMsg(`${secHtml}<span class="uc-q-num">PERGUNTA ${idx + 1}/${QUESTIONS.length}</span><br/><br/>${q.q}`);
                setEnabled(true);
            }, 600);
        }, 200);
    }, [addMsg]);

    /* Init */
    useEffect(() => {
        setTimeout(() => {
            setTyping(true);
            setTimeout(() => {
                setTyping(false);
                addMsg(`<div class="uc-section-tag" style="background:var(--gold-dark);color:var(--ink)">🎌 UMBRA CREATOR · ANIME BOT</div><br/>Bem-vindo ao <strong>Umbra Creator</strong>!<br/><br/>Vou te guiar por <strong>${QUESTIONS.length} perguntas</strong> para criar seu anime do zero — história, personagens, produção visual, áudio, ferramentas e orçamento.<br/><br/>Responda com o máximo de detalhes. Quanto mais informação, melhor o resultado!<br/><br/>Vamos começar 🚀`);
                setTimeout(() => askQuestion(0), 400);
            }, 1200);
        }, 300);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSend = useCallback(async () => {
        const text = input.trim();
        if (!text || !enabled) return;
        setInput(''); setEnabled(false);
        addMsg(text, true);

        const qi = qRef.current;
        const qObj = QUESTIONS[qi];
        if (qObj) {
            setAnswers(prev => ({ ...prev, [qi]: { section: qObj.section, question: qObj.q, answer: text } }));
        }

        setTyping(true);
        const newHistory = [...history, { role: 'user', content: `Pergunta: "${qObj?.q}" — Resposta: "${text}". Dê um feedback breve (1-2 frases) sobre essa resposta.` }];
        setHistory(newHistory);
        try {
            const reply = await callCreatorMistral(newHistory);
            setHistory(h => [...h, { role: 'assistant', content: reply }]);
            setTyping(false);
            addMsg(reply);
        } catch (e: any) {
            setTyping(false);
            addMsg(`⚠️ Erro Mistral: ${e.message}`);
        }

        askQuestion(qi + 1);
    }, [input, enabled, history, addMsg, askQuestion]);

    /* Progress */
    const progress = currentQ < 0 ? 0 : Math.min(100, Math.round((currentQ / QUESTIONS.length) * 100));

    /* Summary */
    const sections: Record<string, { q: string; a: string }[]> = {};
    Object.values(answers).forEach(a => {
        if (!sections[a.section]) sections[a.section] = [];
        sections[a.section].push({ q: a.question, a: a.answer });
    });

    return (
        <div className="uc-root">
            {/* Header */}
            <div className="uc-header">
                <div className="uc-header-left">
                    <span className="uc-rune">🎌</span>
                    <div>
                        <div className="uc-title">UMBRA CREATOR</div>
                        <div className="uc-subtitle">Guia interativo para criar seu anime do zero</div>
                    </div>
                </div>
                <button className="uc-summary-btn" onClick={() => setShowSummary(s => !s)}>
                    {showSummary ? '✕ Fechar' : '📖 Ver Resumo'}
                </button>
            </div>

            {/* Progress bar */}
            <div className="uc-progress">
                <div className="uc-progress-header">
                    <span className="uc-progress-label">
                        {currentQ < 0 ? 'Aguardando início...' :
                            done ? `✅ Concluído! ${QUESTIONS.length}/${QUESTIONS.length}` :
                                `Pergunta ${currentQ + 1} de ${QUESTIONS.length} — ${QUESTIONS[currentQ]?.section || ''}`}
                    </span>
                    <span className="uc-progress-pct">{progress}%</span>
                </div>
                <div className="uc-bar-track">
                    <div className="uc-bar-fill" style={{ width: `${progress}%` }} />
                </div>
            </div>

            {/* Body */}
            <div className="uc-body">
                {/* Chat */}
                <div className="uc-chat-wrap">
                    <div className="uc-chat-header">
                        <div className="uc-status-dot" />
                        <span className="uc-status-txt">ANIME_ARCHITECT · ACTIVE</span>
                        <span className="uc-ai-badge">✦ Mistral AI</span>
                    </div>
                    <div className="uc-messages">
                        {msgs.map(m => (
                            <div key={m.id} className={`uc-msg ${m.isUser ? 'uc-user' : 'uc-bot'}`}>
                                {m.isUser ? (
                                    <>
                                        <div className="uc-bubble uc-user-bubble">{m.html}</div>
                                        <div className="uc-avatar uc-user-av">VOC</div>
                                    </>
                                ) : (
                                    <>
                                        <div className="uc-avatar uc-bot-av">AA</div>
                                        <div className="uc-bubble uc-bot-bubble" dangerouslySetInnerHTML={{ __html: m.html }} />
                                    </>
                                )}
                            </div>
                        ))}
                        {typing && (
                            <div className="uc-msg uc-bot">
                                <div className="uc-avatar uc-bot-av">AA</div>
                                <div className="uc-bubble uc-bot-bubble">
                                    <div className="uc-typing"><span /><span /><span /></div>
                                </div>
                            </div>
                        )}
                        <div ref={endRef} />
                    </div>
                    <div className="uc-input-area">
                        <textarea
                            value={input}
                            disabled={!enabled || done}
                            placeholder={done ? 'Concluído! Veja o resumo →' : 'Digite sua resposta...'}
                            rows={1}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px'; }}
                        />
                        <button className="uc-send-btn" onClick={handleSend} disabled={!enabled || !input.trim() || done}>
                            <svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
                        </button>
                    </div>
                </div>

                {/* Summary sidebar */}
                {showSummary && (
                    <div className="uc-summary-panel">
                        <div className="uc-summary-header">📖 Resumo do Anime</div>
                        {Object.keys(sections).length === 0
                            ? <div className="uc-summary-empty">Responda perguntas para ver o resumo.</div>
                            : Object.entries(sections).map(([sec, items]) => (
                                <div key={sec} className="uc-sum-section">
                                    <div className="uc-sum-sec-title" style={{ background: SECTION_COLORS[sec] || 'var(--gold-dark)' }}>{sec}</div>
                                    {items.map((item, i) => (
                                        <div key={i} className="uc-sum-item">
                                            <div className="uc-sum-q">{item.q}</div>
                                            <div className="uc-sum-a">{item.a}</div>
                                        </div>
                                    ))}
                                </div>
                            ))
                        }
                        {done && (
                            <button className="uc-export-btn" onClick={() => {
                                let txt = '🎌 RESUMO DO MEU ANIME — UMBRA CREATOR\n\n';
                                Object.entries(sections).forEach(([sec, items]) => {
                                    txt += `\n${sec}\n${'─'.repeat(40)}\n`;
                                    items.forEach(i => { txt += `\nPERGUNTA: ${i.q}\nRESPOSTA: ${i.a}\n`; });
                                });
                                const b = new Blob([txt], { type: 'text/plain;charset=utf-8' });
                                const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'meu_anime.txt'; a.click();
                            }}>↓ Exportar TXT</button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
