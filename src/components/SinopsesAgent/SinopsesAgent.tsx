import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { AppSettings } from '../../types/prompt';
import './SinopsesAgent.css';

/* ─── Types ─── */
interface ChatMsg { role: 'user' | 'bot'; text: string; isDescription?: boolean }

/* ─── Constants ─── */
const SYSTEM_PROMPT = `Você é um especialista em criar descrições de sinopses de animes de fantasia/isekai no estilo das seguintes descrições de referência. Você recebe uma ideia simples e transforma em uma descrição completa, rica e envolvente.

ESTILO DE REFERÊNCIA — analise esses padrões das descrições:
- Começam apresentando o mundo ou o protagonista com contexto
- Introduzem o "gancho" (problema, habilidade, situação especial) com emoção
- Usam reticências (...) para criar suspense
- Fazem perguntas retóricas no final ("Conseguirá ele...?", "Será que...?")
- Tom épico mas acessível, às vezes com humor leve
- Apresentam aliados/coadjuvantes com breves caracterizações
- Revelam o twist ou poder especial sem dar tudo de graça
- Entre 100 e 250 palavras
- Linguagem fluente em português brasileiro

EXEMPLOS:
1. "Tendo passado sua infância vivendo na extrema pobreza, Hajime buscou desesperadamente força para sobreviver..."
2. "Em um mundo onde comer as 'Skill Fruits' concede poderes especiais, Light, um jovem rapaz que almeja se tornar o maior aventureiro de todos..."
3. "Apesar de ter nascido como um demônio, a bondade de Dou não tem limites..."

REGRAS:
- Sempre escreva em português do Brasil
- Use o nome que o usuário der ao personagem, ou invente um se não houver
- Capture o gênero: se for romântico, use tom mais suave; se for ação, mais épico
- Máximo 250 palavras
- NÃO explique que está gerando a sinopse, apenas entregue o texto direto
- NÃO use asteriscos, markdown ou formatação especial — texto limpo`;

const FEW_SHOT = [
    { role: 'user' as const, content: 'Garota reencarnada como cientista, nasceu com poder de manipular elementos químicos, família poderosa de espíritos, quer proteger a família' },
    { role: 'assistant' as const, content: 'Ellen, uma menina de 8 anos e meio-espírito, já viveu como cientista no Japão moderno. Agora, ela reencarnou em uma nova família: Rovel, seu pai e herói lendário do reino, e Origin, sua mãe e rainha dos espíritos. Presenteada com memórias e conhecimentos de outra vida, Ellen carrega em seu pequeno coração a sabedoria de décadas — e, com ela, o peso de saber exatamente o que pode ser perdido. Além disso, a própria Ellen tem o poder de manipular elementos químicos, uma habilidade que cruza o domínio da ciência com o do sobrenatural de maneiras que ninguém neste mundo ainda compreende. Mas os poderes de Ellen serão suficientes para proteger a felicidade de sua família?' },
];

const EXAMPLES = [
    'Herói reencarnado como slime, quer vida pacífica',
    'Garota tímida com força sobre-humana absurda',
    'Demônio se apaixona pela heroína adversária',
    'Aventureiro expulso, habilidades de suporte secretamente OP',
];

interface SinopsesAgentProps { settings: AppSettings }

export const SinopsesAgent: React.FC<SinopsesAgentProps> = ({ settings }) => {
    const [messages, setMessages] = useState<ChatMsg[]>([
        {
            role: 'bot',
            text: 'Saudações, viajante. Sou o Escriba Arcano, guardião das sinopses.\n\nDê-me os fragmentos de um anime — personagem principal, mundo, conflito, tom — e transformarei sua ideia em uma descrição completa digna de um grimório.\n\nFale, e as palavras tomarão forma.',
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState<number | null>(null);
    const historyRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const autoResize = useCallback(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 130) + 'px';
    }, []);

    const send = useCallback(async () => {
        const text = input.trim();
        if (!text || loading) return;

        if (!settings.apiKey) {
            alert('Configure sua API Key Mistral nas Configurações (⚙).');
            return;
        }

        setMessages(prev => [...prev, { role: 'user', text }]);
        historyRef.current.push({ role: 'user', content: text });
        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        setLoading(true);

        try {
            const resp = await fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
                body: JSON.stringify({
                    model: 'mistral-large-latest',
                    max_tokens: 800,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        ...FEW_SHOT,
                        ...historyRef.current,
                    ],
                }),
            });

            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                throw new Error((err as { message?: string }).message ?? `Erro ${resp.status}`);
            }

            const data = await resp.json() as { choices: { message: { content: string } }[] };
            const reply = data.choices[0].message.content.trim();
            historyRef.current.push({ role: 'assistant', content: reply });
            const isDesc = reply.length > 150;
            setMessages(prev => [...prev, { role: 'bot', text: reply, isDescription: isDesc }]);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro inesperado';
            setMessages(prev => [...prev, { role: 'bot', text: `⚠️ Os pergaminhos retornaram um erro: ${msg}` }]);
        } finally {
            setLoading(false);
        }
    }, [input, loading, settings.apiKey]);

    const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    };

    const copyText = (text: string, idx: number) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(idx);
            setTimeout(() => setCopied(null), 2000);
        });
    };

    const fillExample = (ex: string) => {
        setInput(ex);
        textareaRef.current?.focus();
        setTimeout(autoResize, 0);
    };

    const clearChat = () => {
        if (messages.length <= 1) return;
        if (confirm('Limpar o histórico do chat?')) {
            historyRef.current = [];
            setMessages([{
                role: 'bot',
                text: 'O grimório foi limpo. Descreva seu anime e verei o que posso forjar...',
            }]);
        }
    };

    return (
        <div className="sa-wrap">
            {/* Header */}
            <div className="sa-header">
                <div className="sa-ornament">✦ ✦ ✦</div>
                <div className="sa-title-row">
                    <div className="sa-title-text">
                        <h2 className="sa-h1">Grimório das Sinopses</h2>
                        <p className="sa-sub">Forja descrições de anime com a arte dos escribas ancestrais</p>
                    </div>
                    <button className="sa-clear-btn" onClick={clearChat} title="Limpar chat">✕</button>
                </div>
                <div className="sa-divider" />
            </div>

            {/* Chat window */}
            <div className="sa-chat-window">
                <div className="sa-chat-header">
                    <div className="sa-status-dot" />
                    <span>Escriba Arcano · Aguardando sua sinopse</span>
                    <div className={`sa-api-badge ${settings.apiKey ? 'active' : ''}`}>
                        <div className="sa-badge-dot" />
                        <span>{settings.apiKey ? 'Chave ativa' : 'Sem chave'}</span>
                    </div>
                </div>

                {/* Messages */}
                <div className="sa-messages">
                    {messages.map((msg, i) => (
                        <div key={i} className={`sa-msg sa-msg-${msg.role}`}>
                            <div className="sa-msg-label">{msg.role === 'bot' ? 'Escriba Arcano' : 'Viajante'}</div>
                            <div className={`sa-bubble ${msg.isDescription ? 'sa-bubble-desc' : ''}`}>
                                {msg.text.split('\n').map((line, li) => (
                                    <span key={li}>{line}{li < msg.text.split('\n').length - 1 && <br />}</span>
                                ))}
                                {msg.isDescription && (
                                    <button className="sa-copy-btn" onClick={() => copyText(msg.text, i)}>
                                        {copied === i ? '✓ Copiado!' : '⊕ Copiar Sinopse'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="sa-msg sa-msg-bot">
                            <div className="sa-msg-label">Escriba Arcano</div>
                            <div className="sa-bubble">
                                <div className="sa-typing">
                                    <span /><span /><span />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Input area */}
                <div className="sa-input-area">
                    <div className="sa-input-wrap">
                        <label className="sa-input-label">Descreva seu anime</label>
                        <textarea
                            ref={textareaRef}
                            className="sa-textarea"
                            placeholder="Ex: um guerreiro banido descobre que sua magia 'inútil' de criar objetos é na verdade a mais poderosa..."
                            rows={2}
                            value={input}
                            onChange={e => { setInput(e.target.value); autoResize(); }}
                            onKeyDown={handleKey}
                        />
                    </div>
                    <button
                        className="sa-send-btn"
                        onClick={send}
                        disabled={loading || !input.trim()}
                        title="Enviar"
                    >
                        ⚡
                    </button>
                </div>
            </div>

            {/* Example pills */}
            <div className="sa-examples">
                <div className="sa-examples-label">✦ Exemplos rápidos ✦</div>
                <div className="sa-pills">
                    {EXAMPLES.map(ex => (
                        <button key={ex} className="sa-pill" onClick={() => fillExample(ex)}>
                            {ex}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
