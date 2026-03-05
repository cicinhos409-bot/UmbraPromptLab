import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { AppSettings } from '../../types/prompt';
import { callMistralProxy } from '../../services/mistralProxy';
import './GrimorioSinopses.css';

/* ─── Types ─── */
interface ChatMessage {
    role: 'user' | 'assistant';
    content: MessageContent;
    displayText?: string; // for user image messages
}
type MessageContent = string | MultiContent[];
interface MultiContent {
    type: 'image_url' | 'text';
    image_url?: string;
    text?: string;
}

/* ─── System Prompt ─── */
const SYSTEM_PROMPT = `Você é um Mestre de criação de personagens consistentes para IA.

REGRA DE OURO — NUNCA IGNORE:
FASES 1, 2 e 3: responda com NO MÁXIMO 6 linhas. Seja telegráfico, direto, sem enrolação.
Nunca use parágrafos longos nas fases 1-3. Use bullets curtos de 1 linha cada.
FASE 4 (prompt final) é a ÚNICA exceção — deve ser longa e ultradetalhada.

---

FASE 1 — ANÁLISE VISUAL (máx. 6 linhas):
Resuma em 5 bullets de 1 linha cada: estilo visual, cabelo/cor, roupa principal, arma/acessório, paleta. Termine com: "Deseja acrescentar algo antes de prosseguir?"

Modelo de resposta da Fase 1:
• Estilo: anime ninja, traços jovens e ágeis
• Cabelo: preto espinho, headband azul
• Roupa: camisa azul gola alta, shorts brancos, amarras de perna
• Arma: kunai no coldre da perna
• Paleta: azul, branco, preto
Deseja acrescentar algo antes de prosseguir?

---

FASE 2 — ARQUÉTIPO & GÊNERO (máx. 6 linhas):
Liste 3 arquétipos em 1 linha cada: "• Nome — descrição em 4 palavras". Termine pedindo gênero e detalhes extras.

Modelo de resposta da Fase 2:
• Shinobi da Sombra — stealth, ataques rápidos e precisos
• Guardião do Clã — protetor, combate corpo a corpo
• Aprendiz Rebelde — impulsivo, poder oculto crescente
Gênero: Masculino / Feminino / Não-Binário? Algum detalhe extra?

---

FASE 3 — FICHA RESUMIDA (máx. 6 linhas):
Apresente os dados em bullets curtos: Nome, Origem, Idade, Aparência-chave, Arma, Traço de personalidade, Hábito único.

Modelo de resposta da Fase 3:
• Nome: Kaito Ryuu | Origem: Vila Oculta da Névoa
• Idade: 16 anos | Raça: Humano Shinobi
• Aparência: magro, cicatriz no queixo, olhos azuis frios
• Arma: kunai duplo + shurikens na bota
• Personalidade: calmo sob pressão, leal até a morte
• Hábito: toca o headband 3x antes de cada missão

---

FASE 4 — PROMPT FINAL (REFERENCE SHEET) — LONGA E DETALHADA:
Gere o prompt técnico completo em INGLÊS com esta estrutura exata:

[KEYWORDS DE ESTILO], complex character sheet, reference sheet, split composition layout. (Left Panel) Full body front view: [build, cabelo, roupa completa, cores, acessórios, pose, expressão]. (Center-Left Panel) Full body side view: [postura lateral, detalhes de roupa, armas, movimento]. (Center-Right Panel) Full body back view: [costas da roupa, elementos traseiros, padrões, texturas]. (Right Panel) Column with 4 detailed headshots: top-down view ([topo da cabeça]), bottom view ([queixo, solas]), side profile ([expressão de perfil, traço marcante]), 3/4 angle ([olhos, expressão]). Character Design: [arquétipo, habilidades, personalidade, arma principal, hábito único]. White neutral background, technical drawing, concept art, high detail, no text.

EXEMPLOS DE REFERÊNCIA:

EXEMPLO A — Ninja Elite:
Anime, complex character sheet, reference sheet, split composition layout. (Left Panel) Full body front view: Slim athletic build, silver spiky hair, black headband with hole, green jacket with red cloud symbol, black pants with white stripes, bandage wraps on arms and legs, ninja sword on back. (Center-Left Panel) Full body side view: Fluid movement pose, bandage wraps detail, shadows under arms and jaw. (Center-Right Panel) Full body back view: Sword scabbard with red cloud engravings, bandages covering lower back. (Right Panel) Column with 4 detailed headshots: top-down view (spiky hair fanned out), bottom view (bandaged hands gripping hilt), side profile (cold determined expression, light brown skin), 3/4 angle (headband shadow over one eye). Character Design: Elite Ninja, shadow techniques specialist, uses bandages to isolate pain. White neutral background, technical drawing, concept art, high detail, no text.

REGRAS OBRIGATÓRIAS DO PROMPT FINAL:
1. Sempre em inglês
2. Sempre 4 painéis: Left / Center-Left / Center-Right / Right (com 4 headshots)
3. Headshots: top-down view, bottom view, side profile, 3/4 angle
4. Sempre terminar com: "White neutral background, technical drawing, concept art, high detail, no text."
5. Máximo detalhe visual em cada painel
6. Gerar dentro de bloco de código com três crases

Responda em português nas fases 1-3. Prompt final em inglês.`;

/* ─── Quick prompts ─── */
const QUICK_PROMPTS = [
    { icon: '⚔️', label: 'Guerreiro Élfico', text: 'Guerreiro élfico com armadura verde, fantasia medieval dark, masculino' },
    { icon: '🧛', label: 'Vampira Gótica', text: 'Vampira elegante, estilo gótico vitoriano, feminino, olhos vermelhos' },
    { icon: '🧙', label: 'Mago Ancião', text: 'Mago ancião misterioso, barba longa, cajado de cristal, estilo Pixar 3D' },
    { icon: '🤖', label: 'Android Cyberpunk', text: 'Android futurista, cyberpunk, olhos brilhantes neon, corpo metálico' },
    { icon: '⛩️', label: 'Samurai Anime', text: 'Guerreira samurai, estilo anime, kimono vermelho, espada katana' },
    { icon: '🥷', label: 'Ninja Chibi', text: 'Ninja chibi, casaco azul com capuz, lâminas duplas, expressão focada' },
];

/* ─── Props ─── */
interface GrimorioSinopsesProps {
    settings: AppSettings;
}

export const GrimorioSinopses: React.FC<GrimorioSinopsesProps> = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [pendingImage, setPendingImage] = useState<{ base64: string; mime: string; preview: string } | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    /* ── Auto-resize textarea ── */
    const autoResize = useCallback(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 140) + 'px';
    }, []);

    /* ── Image upload ── */
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            const base64 = dataUrl.split(',')[1];
            setPendingImage({ base64, mime: file.type, preview: dataUrl });
        };
        reader.readAsDataURL(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    /* ── Send ── */
    const send = useCallback(async () => {
        const text = input.trim();
        if (!text && !pendingImage) return;
        if (isLoading) return;

        // Build display and API content
        const displayText = text || '[Imagem enviada para análise]';
        let userContent: MessageContent;
        let apiContent: string | MultiContent[];

        if (pendingImage) {
            apiContent = [
                { type: 'image_url', image_url: `data:${pendingImage.mime};base64,${pendingImage.base64}` },
                { type: 'text', text: text || 'Analise esta imagem de referência do personagem e inicie a Fase 1.' },
            ];
            userContent = apiContent;
        } else {
            userContent = text;
            apiContent = text;
        }

        const newMsg: ChatMessage = { role: 'user', content: userContent, displayText };
        const updatedHistory = [...messages, newMsg];
        setMessages(updatedHistory);
        setInput('');
        setPendingImage(null);
        setIsLoading(true);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        // Build messages for API
        const apiMessages = updatedHistory.map(m => ({
            role: m.role,
            content: typeof m.content === 'string' ? m.content :
                (m.content as MultiContent[]).map(p => p.type === 'image_url'
                    ? { type: 'image_url', image_url: p.image_url }
                    : { type: 'text', text: p.text })
        }));

        try {
            const reply = await callMistralProxy({
                model: 'mistral-large-latest',
                max_tokens: 2400,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    ...apiMessages
                ],
            });
            setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro inesperado';
            setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${msg}` }]);
        } finally {
            setIsLoading(false);
        }
    }, [input, pendingImage, isLoading, messages]);

    const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    };

    /* ── Copy to clipboard ── */
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => showToast('✦ Prompt copiado!'));
    };

    const showToast = (msg: string) => {
        const toast = document.createElement('div');
        toast.className = 'gs-toast';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2800);
    };

    /* ── Clear chat ── */
    const clearChat = () => {
        if (messages.length === 0) return;
        if (confirm('Deseja limpar todo o histórico?')) setMessages([]);
    };

    /* ── Download chat ── */
    const downloadChat = () => {
        if (messages.length === 0) { showToast('⚠ Nenhuma conversa para baixar'); return; }
        let txt = `GRIMÓRIO DAS SINOPSES — HISTÓRICO\nData: ${new Date().toLocaleString('pt-BR')}\n${'═'.repeat(60)}\n\n`;
        messages.forEach(m => {
            const role = m.role === 'user' ? '◈ VOCÊ' : '✦ MESTRE';
            const content = m.displayText ?? (typeof m.content === 'string' ? m.content : '[imagem]');
            txt += `${role}\n${content}\n\n${'─'.repeat(40)}\n\n`;
        });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }));
        a.download = `grimorio_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
    };

    /* ── Format AI text ── */
    const renderAIBubble = (text: string) => {
        const parts: React.ReactNode[] = [];
        let remaining = text;
        let key = 0;

        // Handle code blocks first
        const codeRegex = /```[a-z]*\n?([\s\S]*?)```/g;
        let lastIndex = 0;
        let match;
        while ((match = codeRegex.exec(text)) !== null) {
            const before = text.slice(lastIndex, match.index);
            if (before) parts.push(<span key={key++} dangerouslySetInnerHTML={{ __html: formatInline(before) }} />);
            const code = match[1].trim();
            parts.push(
                <div key={key++} className="gs-prompt-box">
                    <div className="gs-prompt-label">PROMPT GERADO</div>
                    <button className="gs-copy-btn" onClick={() => copyToClipboard(code)}>COPIAR</button>
                    <pre>{code}</pre>
                </div>
            );
            lastIndex = match.index + match[0].length;
        }
        remaining = text.slice(lastIndex);
        if (remaining) parts.push(<span key={key++} dangerouslySetInnerHTML={{ __html: formatInline(remaining) }} />);

        // Phase 2 gender buttons
        const isPhase2 = /gênero.*masculino|masculino.*feminino/i.test(text);
        const hasProceed = /deseja acrescentar|prosseguir|mais algum detalhe/i.test(text);

        return (
            <>
                {parts}
                {isPhase2 && (
                    <div className="gs-choices" style={{ marginTop: '10px' }}>
                        <div className="gs-field-label">ESCOLHA O GÊNERO:</div>
                        {['Masculino', 'Feminino', 'Não-Binário'].map(g => (
                            <button key={g} className="gs-choice-btn gs-gender" onClick={() => quickReply(`Gênero escolhido: ${g}`)}>
                                {g}
                            </button>
                        ))}
                    </div>
                )}
                {hasProceed && (
                    <div className="gs-choices" style={{ marginTop: '10px' }}>
                        <button className="gs-choice-btn gs-proceed" onClick={() => quickReply('JÁ ESTÁ BOM, PROSSIGA!')}>
                            ✓ Prossiga!
                        </button>
                        <button className="gs-choice-btn" onClick={() => textareaRef.current?.focus()}>
                            + Adicionar detalhes
                        </button>
                    </div>
                )}
            </>
        );
    };

    const formatInline = (str: string): string => {
        return str
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/^#{1,3}\s+(.+)$/gm, '<span class="gs-h3">$1</span>')
            .replace(/^[•\-]\s+(.+)$/gm, '<span class="gs-bullet">• $1</span>')
            .replace(/\n/g, '<br>');
    };

    const quickReply = (text: string) => {
        setInput(text);
        setTimeout(() => send(), 50);
    };

    return (
        <div className="gs-container">
            {/* Header */}
            <div className="gs-header">
                <div className="gs-logo">
                    <div className="gs-logo-icon">✦</div>
                    <div className="gs-logo-text">
                        <span className="gs-logo-name">GRIMÓRIO DE PERSONAGENS</span>
                        <span className="gs-logo-sub">PERSONAGENS CONSISTENTES · MISTRAL AI</span>
                    </div>
                </div>
                <div className="gs-header-actions">
                    <button className="gs-header-btn" onClick={downloadChat} title="Baixar histórico">⬇</button>
                    <button className="gs-header-btn gs-danger" onClick={clearChat} title="Limpar chat">✕</button>
                </div>
            </div>

            {/* Chat area */}
            <div className="gs-chat">
                {/* Welcome message */}
                {messages.length === 0 && (
                    <div className="gs-welcome">
                        <div className="gs-ornament">· · · ✦ · · ·</div>
                        <div className="gs-msg gs-msg-ai">
                            <div className="gs-avatar">✦</div>
                            <div className="gs-bubble">
                                <span className="gs-bubble-label">MESTRE DE CRIAÇÃO</span>
                                <p>Saudações, criador! Sou o <strong>Grimório de Personagens</strong> — especializado em criar personagens detalhados e prompts técnicos de <em>reference sheet</em> para Midjourney, DALL-E, Stable Diffusion, Sora e Kling.</p>
                                <p>Trabalho em <strong>4 Fases</strong> para garantir máxima consistência:</p>
                            </div>
                        </div>
                        <div className="gs-phase-cards">
                            <div className="gs-phase-card gs-p1">
                                <span className="gs-phase-badge">✦ FASE 1</span>
                                <div className="gs-phase-title">Análise de Referência Visual</div>
                                <div className="gs-phase-desc">Envie uma imagem ou descreva o personagem</div>
                            </div>
                            <div className="gs-phase-card gs-p2">
                                <span className="gs-phase-badge">✦ FASE 2</span>
                                <div className="gs-phase-title">Arquétipo & Gênero</div>
                                <div className="gs-phase-desc">Sugestões de arquétipo e definição de gênero</div>
                            </div>
                            <div className="gs-phase-card gs-p3">
                                <span className="gs-phase-badge">✦ FASE 3</span>
                                <div className="gs-phase-title">Ficha Completa</div>
                                <div className="gs-phase-desc">Identidade, aparência e personalidade</div>
                            </div>
                            <div className="gs-phase-card gs-p4">
                                <span className="gs-phase-badge">✦ FASE 4</span>
                                <div className="gs-phase-title">Prompt Reference Sheet</div>
                                <div className="gs-phase-desc">Prompt técnico com 4 painéis + headshots</div>
                            </div>
                        </div>
                        <p className="gs-start-hint">Descreva ou envie uma imagem do seu personagem abaixo ↓</p>
                    </div>
                )}

                {/* Messages */}
                {messages.map((msg, i) => (
                    <div key={i} className={`gs-msg ${msg.role === 'user' ? 'gs-msg-user' : 'gs-msg-ai'}`}>
                        <div className="gs-avatar">{msg.role === 'user' ? '◈' : '✦'}</div>
                        <div className="gs-bubble">
                            {msg.role === 'assistant' && <span className="gs-bubble-label">MESTRE DE CRIAÇÃO</span>}
                            {msg.role === 'user'
                                ? <p>{msg.displayText ?? (typeof msg.content === 'string' ? msg.content : '[Imagem enviada]')}</p>
                                : renderAIBubble(typeof msg.content === 'string' ? msg.content : '')
                            }
                        </div>
                    </div>
                ))}

                {/* Typing indicator */}
                {isLoading && (
                    <div className="gs-msg gs-msg-ai">
                        <div className="gs-avatar">✦</div>
                        <div className="gs-bubble">
                            <div className="gs-typing">
                                <span /><span /><span />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={chatEndRef} />
            </div>

            {/* Quick prompts strip */}
            <div className="gs-quick-strip">
                {QUICK_PROMPTS.map(q => (
                    <button key={q.label} className="gs-quick-btn" onClick={() => {
                        setInput(q.text);
                        textareaRef.current?.focus();
                    }}>
                        {q.icon} {q.label}
                    </button>
                ))}
            </div>

            {/* Input area */}
            <div className="gs-input-area">
                {/* Pending image preview */}
                {pendingImage && (
                    <div className="gs-img-preview">
                        <img src={pendingImage.preview} alt="preview" />
                        <span>IMAGEM CARREGADA</span>
                        <button onClick={() => setPendingImage(null)}>✕</button>
                    </div>
                )}

                <div className="gs-input-row">
                    {/* Image upload button */}
                    <label className="gs-img-btn" title="Enviar imagem de referência">
                        🖼
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleImageUpload}
                        />
                    </label>

                    <textarea
                        ref={textareaRef}
                        className="gs-textarea"
                        placeholder="Descreva o personagem ou envie uma imagem (🖼) para iniciar..."
                        value={input}
                        rows={1}
                        onChange={e => { setInput(e.target.value); autoResize(); }}
                        onKeyDown={handleKey}
                    />

                    <button
                        className="gs-send-btn"
                        onClick={send}
                        disabled={isLoading || (!input.trim() && !pendingImage)}
                    >
                        ➤
                    </button>
                </div>
                <p className="gs-input-hint">🖼 Enviar imagem · Enter para enviar · Shift+Enter para nova linha</p>
            </div>
        </div>
    );
};
