import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { AppSettings } from '../../types/prompt';
import './UmbraVoz.css';

interface UmbraVozProps {
    settings: AppSettings | null;
}

type Variant = 'standard' | 'short' | 'dramatic';
type TabName = 'json' | 'prompt' | 'flow' | 'ficha';
type FlowState = 'questions' | 'confirmation' | 'generating' | 'done';

interface ChatMsg { id: string; html: string; isUser: boolean; }
interface Collected { genero: string; idade: string; regiao: string; frase: string; }
interface SavedVoice { id: number; profile: VocalProfile; savedAt: string; }
interface VocalProfile { [key: string]: any; }
interface OutputData { json: string; standard: string; short: string; dramatic: string; flow: string; profile: VocalProfile; }

let _msgId = 0;
const newId = () => `uvm-${++_msgId}`;

const QUESTIONS = [
    { key: 'genero' as keyof Collected, label: 'PERGUNTA I — GÊNERO VOCAL', text: 'Qual o <strong>gênero vocal</strong> do personagem?', hint: 'Ex: masculino, feminino, andrógino' },
    { key: 'idade' as keyof Collected, label: 'PERGUNTA II — IDADE', text: 'Qual a <strong>idade exata</strong> do personagem?', hint: 'Ex: 28 anos, 45, 67' },
    { key: 'regiao' as keyof Collected, label: 'PERGUNTA III — ORIGEM', text: 'De qual <strong>região ou país</strong> ele é?', hint: 'Ex: São Paulo, Rio de Janeiro, Portugal, EUA, Argentina...' },
    { key: 'frase' as keyof Collected, label: 'PERGUNTA IV — O QUE DIZ', text: 'Qual <strong>frase ou ideia</strong> ele vai dizer no VEO 3?', hint: 'Cole a frase exata ou descreva o contexto da cena' },
];

/* ── Local fallback profile generator ────────────────────────────── */
function generateProfileLocal(d: Collected): VocalProfile {
    const { genero, idade, regiao, frase } = d;
    const gLow = genero.toLowerCase();
    const isMale = /mascul|homem|male/.test(gLow);
    const isFemale = /femin|mulher|female/.test(gLow);
    const ageNum = parseInt(idade) || 30;
    const regLow = regiao.toLowerCase();

    let freqBase: string, pitch: string, timbre: string, ressonancia: string;
    if (isMale) {
        freqBase = ageNum < 25 ? '110-130 Hz' : ageNum > 55 ? '88-108 Hz' : '100-118 Hz';
        pitch = ageNum > 50 ? 'grave' : 'médio-grave';
        timbre = ageNum > 45 ? 'encorpado com aspereza maturada' : 'denso e encorpado';
        ressonancia = 'peitoral dominante com harmônicos sub-glóticos';
    } else if (isFemale) {
        freqBase = ageNum < 25 ? '200-225 Hz' : ageNum > 55 ? '160-185 Hz' : '180-210 Hz';
        pitch = ageNum < 25 ? 'médio-agudo' : 'médio';
        timbre = ageNum > 45 ? 'aveludado com profundidade' : 'brilhante e expressivo';
        ressonancia = 'torácica com harmônicos nasais suaves';
    } else {
        freqBase = '145-170 Hz';
        pitch = 'médio fluido';
        timbre = 'híbrido andrógino';
        ressonancia = 'distribuída — peitoral e nasal equilibrados';
    }

    let sotaque: string, classe: string;
    if (/são paulo|sao paulo/.test(regLow)) { sotaque = 'Português brasileiro — paulistano neutro'; classe = 'classe média urbana — direto'; }
    else if (/rio/.test(regLow)) { sotaque = 'Carioca — vogais abertas, entonação melodiosa'; classe = 'carioca urbano — relaxado'; }
    else if (/brasil|brazil/.test(regLow)) { sotaque = 'Português brasileiro neutro'; classe = 'urbano brasileiro'; }
    else if (/portugal|lisboa/.test(regLow)) { sotaque = 'Português europeu — fechado e gutural'; classe = 'europeu formal'; }
    else if (/eua|usa|estados unidos/.test(regLow)) { sotaque = 'American English — General American'; classe = 'American professional'; }
    else if (/uk|england|london|british/.test(regLow)) { sotaque = 'British RP — Received Pronunciation'; classe = 'British educated'; }
    else if (/argentin/.test(regLow)) { sotaque = 'Rioplatense — yeísmo rehilado'; classe = 'portenho urbano — dramático'; }
    else { sotaque = `Neutro de ${regiao}`; classe = 'urbano contemporâneo'; }

    let wpm = 132;
    if (/rio/.test(regLow)) wpm = 148; else if (/brasil|são paulo/.test(regLow)) wpm = 140;
    else if (/uk|british|portugal/.test(regLow)) wpm = 122; else if (/argentin/.test(regLow)) wpm = 136;
    if (ageNum < 22) wpm += 14; if (ageNum > 58) wpm -= 14;

    const nivelAr = isFemale ? 0.12 : 0.08;
    const nivelRough = ageNum > 48 ? 0.28 : ageNum < 22 ? 0.05 : 0.12;

    return {
        _perfil_vocal: `UmbraVoz v1.0 — ${genero}, ${idade}, ${regiao}`,
        _frase_referencia: frase,
        identidade_vocal: {
            genero_vocal: genero, idade_exata: idade, nationality: regiao,
            sotaque, classe_social_refletida: classe,
            arquetipo_vocal: isMale ? (ageNum > 45 ? 'mentor autoritário' : 'protagonista confiante') : (ageNum > 45 ? 'figura maternal sábia' : 'protagonista expressiva'),
        },
        arquitetura_acustica: {
            frequencia_base_hz: freqBase, faixa_confortavel_hz: isFemale ? '150–290 Hz' : '80–165 Hz',
            pitch_medio: pitch, variacao_maxima_pitch: isFemale ? '±80 Hz' : '±50 Hz',
            timbre, ressonancia_primaria: ressonancia,
            nivel_aspereza: `${nivelRough} (0=suave, 1=rugoso)`,
            nivel_ar_na_voz: `${nivelAr} (0=seco, 1=muito ar)`,
            estabilidade: ageNum > 60 ? 'leve vibrato natural — 0.05 Hz' : 'estável com micro-variações orgânicas',
        },
        ritmo_dramatico: {
            palavras_por_minuto: wpm,
            duracao_pausa_dramatica_ms: '600–900 ms antes de palavras-chave',
            ritmo_calmo: `${wpm - 20} WPM — deliberado`,
            ritmo_sob_pressao: `${wpm + 25} WPM — urgente`,
            ritmo_sob_emocao_intensa: `${wpm + 10} WPM — intenso`,
        },
        articulacao: {
            precisao_consoantes: isFemale ? 'alta — finais definidos' : 'média-alta',
            sibilancia: /argentin|uruguai/.test(regLow) ? 'sh-ização característica — chiado rioplatense' : 'moderada',
            padrao_final_de_frase: 'descida gradual de pitch — assertivo e conclusivo',
            especificidade_regional: sotaque,
        },
        parametros_fixos_consistencia: {
            pitch_central: isMale ? (ageNum > 48 ? '100 Hz' : '110 Hz') : (ageNum > 48 ? '182 Hz' : '200 Hz'),
            variacao_maxima_permitida: isFemale ? '±75 Hz' : '±45 Hz',
            velocidade_padrao_wpm: wpm,
            nivel_fixo_ar: nivelAr,
            nivel_fixo_rouquidao: nivelRough,
            instrucao_veo3_completa: `Character is ${genero}, ${idade} years old, from ${regiao}. Voice: ${sotaque}. Pitch: ${pitch} (${freqBase}). Timbre: ${timbre}. ${wpm} WPM. Air level: ${nivelAr}. Roughness: ${nivelRough}.`,
        },
    };
}

/* ── Mistral API call ─────────────────────────────────────────────── */
async function generateProfileWithMistral(d: Collected, apiKey: string): Promise<VocalProfile> {
    const systemPrompt = `Você é especialista em fonoaudiologia e design vocal para IA. Responda APENAS com JSON válido, sem markdown, sem texto extra.`;
    const userPrompt = `Gere um perfil vocal técnico para:
- Gênero vocal: ${d.genero}
- Idade: ${d.idade}
- Origem/Região: ${d.regiao}
- Frase de referência: "${d.frase}"

Retorne APENAS este JSON preenchido (sem markdown):
{
  "_perfil_vocal": "UmbraVoz v1.0 — [resumo]",
  "_frase_referencia": "${d.frase}",
  "identidade_vocal": { "genero_vocal":"","idade_exata":"","nationality":"","sotaque":"","classe_social_refletida":"","arquetipo_vocal":"" },
  "arquitetura_acustica": { "frequencia_base_hz":"","faixa_confortavel_hz":"","pitch_medio":"","variacao_maxima_pitch":"","timbre":"","ressonancia_primaria":"","nivel_aspereza":"","nivel_ar_na_voz":"","estabilidade":"" },
  "ritmo_dramatico": { "palavras_por_minuto":0,"duracao_pausa_dramatica_ms":"","ritmo_calmo":"","ritmo_sob_pressao":"","ritmo_sob_emocao_intensa":"" },
  "articulacao": { "precisao_consoantes":"","sibilancia":"","padrao_final_de_frase":"","especificidade_regional":"" },
  "parametros_fixos_consistencia": { "pitch_central":"","variacao_maxima_permitida":"","velocidade_padrao_wpm":0,"nivel_fixo_ar":0.0,"nivel_fixo_rouquidao":0.0,"instrucao_veo3_completa":"" }
}`;

    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: 'mistral-large-latest',
            temperature: 0.4,
            max_tokens: 2500,
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        }),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).message || `HTTP ${res.status}`); }
    const data = await res.json();
    const raw = (data.choices[0].message.content as string).replace(/```json|```/g, '').trim();
    return JSON.parse(raw);
}

/* ── Output builders ──────────────────────────────────────────────── */
function buildVariant(p: VocalProfile, variant: Variant): string {
    const id = p.identidade_vocal || {};
    const ac = p.arquitetura_acustica || {};
    const rd = p.ritmo_dramatico || {};
    const art = p.articulacao || {};
    const fix = p.parametros_fixos_consistencia || {};
    const fr = p._frase_referencia || '';

    if (variant === 'short') return `[VOICE LOCK — SHORT CLIP]
Character: ${id.genero_vocal}, ${id.idade_exata}, from ${id.nationality}
Accent: ${id.sotaque}
Pitch: ${ac.pitch_medio} (${ac.frequencia_base_hz}) | Timbre: ${ac.timbre}
Speed: ${rd.palavras_por_minuto} WPM | Air: ${fix.nivel_fixo_ar} | Roughness: ${fix.nivel_fixo_rouquidao}
Character says: "${fr}"
[END VOICE LOCK]`;

    if (variant === 'dramatic') return `[VOICE LOCK — DRAMATIC SCENE]
Character: ${id.genero_vocal}, ${id.idade_exata}, from ${id.nationality}
Accent: ${id.sotaque} | Class: ${id.classe_social_refletida}
Pitch: ${ac.pitch_medio} (${ac.frequencia_base_hz}) — never deviate beyond ${fix.variacao_maxima_permitida}
Timbre: ${ac.timbre}  |  Resonance: ${ac.ressonancia_primaria}
Air: ${ac.nivel_ar_na_voz} | Roughness: ${ac.nivel_aspereza} | Stability: ${ac.estabilidade}
Speed: ${rd.ritmo_sob_emocao_intensa}
Dramatic pause: ${rd.duracao_pausa_dramatica_ms} before key words
Consonants: ${art.precisao_consoantes}
Character says with gravitas: "${fr}"
[END VOICE LOCK — DO NOT MODIFY]`;

    return `[VOICE LOCK — COPY THIS EXACTLY IN EVERY PROMPT]

Character speaks with a ${id.genero_vocal} voice, ${id.idade_exata} years old, from ${id.nationality}.

VOICE ARCHITECTURE:
- Accent: ${id.sotaque}
- Pitch: ${ac.pitch_medio} (${ac.frequencia_base_hz})
- Timbre: ${ac.timbre}
- Resonance: ${ac.ressonancia_primaria}
- Air in voice: ${ac.nivel_ar_na_voz}
- Roughness: ${ac.nivel_aspereza}
- Stability: ${ac.estabilidade}

DELIVERY:
- Speaking rate: ${rd.palavras_por_minuto} WPM — measured and confident
- Dramatic pauses: ${rd.duracao_pausa_dramatica_ms} before key words
- Consonant precision: ${art.precisao_consoantes}
- Sibilance: ${art.sibilancia}
- Sentence endings: ${art.padrao_final_de_frase}

CONSISTENCY LOCK:
- Pitch center: ${fix.pitch_central} — never deviate beyond ${fix.variacao_maxima_permitida}
- Speed: always ${fix.velocidade_padrao_wpm} WPM at baseline
- Air level: ${fix.nivel_fixo_ar} | Roughness: ${fix.nivel_fixo_rouquidao}

CHARACTER SAYS:
"${fr}"

[END VOICE LOCK — DO NOT MODIFY THIS BLOCK]`;
}

function buildFlow(p: VocalProfile): string {
    const id = p.identidade_vocal || {};
    const ac = p.arquitetura_acustica || {};
    const rd = p.ritmo_dramatico || {};
    const fix = p.parametros_fixos_consistencia || {};
    return `[GOOGLE FLOW / VEO 3.1 — INGREDIENTS TO VIDEO]

REFERENCE IMAGE: [Attach character reference image here]

VOICE INGREDIENT:
- Character: ${id.genero_vocal}, ${id.idade_exata}, from ${id.nationality}
- Voice profile: ${id.sotaque}
- Archetype: ${id.arquetipo_vocal || 'protagonist'}

ACOUSTIC LOCK:
- Fundamental: ${ac.frequencia_base_hz}
- Pitch center: ${fix.pitch_central} ± ${fix.variacao_maxima_permitida}
- Timbre: ${ac.timbre}
- Resonance: ${ac.ressonancia_primaria}

DELIVERY LOCK:
- WPM: ${fix.velocidade_padrao_wpm}
- Air: ${fix.nivel_fixo_ar} | Roughness: ${fix.nivel_fixo_rouquidao}
- Rhythm: ${rd.ritmo_calmo} (calm) / ${rd.ritmo_sob_pressao} (pressured)

SCENE INSTRUCTION:
Character uses the EXACT same voice profile as previous scene.
Match pitch, timbre and delivery precisely.
Character says: "${p._frase_referencia}"

[ADD TO SCENE — maintain voice consistency across all clips]`;
}

function buildFichaHTML(p: VocalProfile): string {
    const id = p.identidade_vocal || {};
    const ac = p.arquitetura_acustica || {};
    const rd = p.ritmo_dramatico || {};
    const fix = p.parametros_fixos_consistencia || {};

    const sections: [string, [string, string | number][]][] = [
        ['Identidade', [['Gênero', id.genero_vocal], ['Idade', id.idade_exata], ['Origem', id.nationality], ['Sotaque', id.sotaque], ['Classe', id.classe_social_refletida], ['Arquétipo', id.arquetipo_vocal || '—']]],
        ['Arquitetura Acústica', [['Frequência base', ac.frequencia_base_hz], ['Faixa confortável', ac.faixa_confortavel_hz], ['Pitch médio', ac.pitch_medio], ['Timbre', ac.timbre], ['Ressonância', ac.ressonancia_primaria], ['Ar na voz', ac.nivel_ar_na_voz], ['Rouquidão', ac.nivel_aspereza]]],
        ['Ritmo & Entrega', [['WPM padrão', rd.palavras_por_minuto], ['Ritmo calmo', rd.ritmo_calmo], ['Sob pressão', rd.ritmo_sob_pressao], ['Pausa dramática', rd.duracao_pausa_dramatica_ms]]],
        ['Parâmetros Fixos', [['Pitch central', fix.pitch_central], ['Variação máxima', fix.variacao_maxima_permitida], ['WPM fixo', fix.velocidade_padrao_wpm], ['Ar fixo', fix.nivel_fixo_ar], ['Rouquidão fixa', fix.nivel_fixo_rouquidao]]],
    ];

    return sections.map(([title, rows]) => `
        <div class="uv-ficha-section">
            <div class="uv-ficha-header">${title}</div>
            ${rows.map(([k, v]) => `<div class="uv-ficha-row"><span class="uv-ficha-key">${k}</span><span class="uv-ficha-val">${v ?? '—'}</span></div>`).join('')}
        </div>
    `).join('') + `<div class="uv-ficha-section"><div class="uv-ficha-header">Frase de Referência</div><div class="uv-ficha-quote">"${p._frase_referencia}"</div></div>`;
}

function buildFichaText(p: VocalProfile): string {
    const id = p.identidade_vocal || {};
    const ac = p.arquitetura_acustica || {};
    const rd = p.ritmo_dramatico || {};
    const fix = p.parametros_fixos_consistencia || {};
    return `FICHA VOCAL — UmbraVoz v1.0\n${p._perfil_vocal}\n\nIdentidade\nGênero: ${id.genero_vocal}\nIdade: ${id.idade_exata}\nOrigem: ${id.nationality}\nSotaque: ${id.sotaque}\n\nArquitetura Acústica\nFrequência: ${ac.frequencia_base_hz}\nPitch: ${ac.pitch_medio}\nTimbre: ${ac.timbre}\nAr: ${ac.nivel_ar_na_voz}\n\nRitmo\nWPM: ${rd.palavras_por_minuto}\nPausa: ${rd.duracao_pausa_dramatica_ms}\n\nParâmetros Fixos\nPitch central: ${fix.pitch_central}\nWPM: ${fix.velocidade_padrao_wpm}\nAr: ${fix.nivel_fixo_ar}\nRouquidão: ${fix.nivel_fixo_rouquidao}\n\nFrase: "${p._frase_referencia}"`;
}

function buildAllOutputData(p: VocalProfile): OutputData {
    return { json: JSON.stringify(p, null, 2), standard: buildVariant(p, 'standard'), short: buildVariant(p, 'short'), dramatic: buildVariant(p, 'dramatic'), flow: buildFlow(p), profile: p };
}

function detectCorrection(text: string): { key: keyof Collected | null; value: string; label: string } {
    const low = text.toLowerCase();
    if (/gên|gen|mascul|feminino|andrógino/.test(low)) return { key: 'genero', value: text.replace(/gênero[:\s]*/i, '').trim(), label: 'Gênero' };
    if (/idade|\d{1,3}\s*ano/.test(low)) return { key: 'idade', value: text.replace(/idade[:\s]*/i, '').trim(), label: 'Idade' };
    if (/origem|região|país|cidade/.test(low)) return { key: 'regiao', value: text.replace(/origem[:\s]*/i, '').trim(), label: 'Origem' };
    if (/frase|dizer|"/.test(low)) return { key: 'frase', value: text.replace(/frase[:\s]*/i, '').replace(/[""]/g, '').trim(), label: 'Frase' };
    return { key: null, value: '', label: '' };
}

/* ── Component ────────────────────────────────────────────────────── */
export const UmbraVoz: React.FC<UmbraVozProps> = ({ settings }) => {
    const [phase, setPhase] = useState(1);
    const [flowSt, setFlowSt] = useState<FlowState>('questions');
    const [currentQ, setCurrentQ] = useState(0);
    const [collected, setCollected] = useState<Collected>({ genero: '', idade: '', regiao: '', frase: '' });
    const [profile, setProfile] = useState<VocalProfile | null>(null);
    const [msgs, setMsgs] = useState<ChatMsg[]>([]);
    const [typing, setTyping] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [inputText, setInputText] = useState('');
    const [outputData, setOutputData] = useState<OutputData | null>(null);
    const [activeTab, setActiveTab] = useState<TabName>('json');
    const [variant, setVariant] = useState<Variant>('standard');
    const [savedVoices, setSavedVoices] = useState<SavedVoice[]>(() => {
        try { return JSON.parse(localStorage.getItem('umbravoz_voices') || '[]'); }
        catch { return []; }
    });
    const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

    const msgsEndRef = useRef<HTMLDivElement>(null);
    const collRef = useRef(collected);
    const qRef = useRef(currentQ);
    const flowRef = useRef(flowSt);

    useEffect(() => { collRef.current = collected; }, [collected]);
    useEffect(() => { qRef.current = currentQ; }, [currentQ]);
    useEffect(() => { flowRef.current = flowSt; }, [flowSt]);
    useEffect(() => { msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, typing]);

    const showToast = useCallback((msg: string, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 2800);
    }, []);

    const addMsg = useCallback((html: string, isUser = false) => {
        setMsgs(prev => [...prev, { id: newId(), html, isUser }]);
    }, []);

    /* ── Chat flow helpers ── */
    const askQuestion = useCallback((idx: number) => {
        setCurrentQ(idx); qRef.current = idx;
        setPhase(1);
        setTimeout(() => {
            setTyping(true);
            setTimeout(() => {
                setTyping(false);
                const q = QUESTIONS[idx];
                addMsg(`<div class="uv-q-badge">${q.label}</div><br/><div class="uv-single-q">${q.text}</div><br/><span class="uv-hint">Ex: ${q.hint}</span>`);
                setEnabled(true);
            }, 700);
        }, 200);
    }, [addMsg]);

    const startConfirmation = useCallback(() => {
        setPhase(2); setFlowSt('confirmation'); flowRef.current = 'confirmation';
        setEnabled(false);
        const c = collRef.current;
        setTimeout(() => {
            setTyping(true);
            setTimeout(() => {
                setTyping(false);
                addMsg(`<div class="uv-q-badge">CONFIRMAÇÃO — REVISÃO DOS DADOS</div><br/>
                    Ótimo! Dados coletados:<br/><br/>
                    <strong>Gênero vocal:</strong> ${c.genero}<br/>
                    <strong>Idade:</strong> ${c.idade}<br/>
                    <strong>Origem:</strong> ${c.regiao}<br/>
                    <strong>Frase:</strong> <em>"${c.frase}"</em><br/><br/>
                    Confirma? Digite <strong>sim</strong> para conjurar o perfil, ou corrija o que precisar.`);
                setEnabled(true);
            }, 900);
        }, 200);
    }, [addMsg]);

    const startGeneration = useCallback(async () => {
        setPhase(3); setFlowSt('generating'); flowRef.current = 'generating';
        setEnabled(false);
        addMsg(`<div class="uv-ai-thinking">Consultando os archivos da Mistral AI...</div>`);
        const c = collRef.current;
        const key = settings?.apiKey;
        try {
            const prof = key
                ? await generateProfileWithMistral(c, key)
                : generateProfileLocal(c);
            if (!key) addMsg('ℹ️ API Key não configurada — usando motor local como fallback.');
            setProfile(prof);
            setPhase(4); setFlowSt('done'); flowRef.current = 'done';
            addMsg(`<div class="uv-q-badge">CONJURAÇÃO COMPLETA</div><br/>
                ✦ <strong>Grimório vocal gerado!</strong><br/><br/>
                Perfil de <em>${c.genero}, ${c.idade}, ${c.regiao}</em> disponível abaixo em 4 formatos.<br/>
                Use o <strong>Prompt VEO 3</strong> colando o bloco completo em cada cena.`);
            setOutputData(buildAllOutputData(prof));
        } catch (err: any) {
            addMsg(`⚠️ <strong>Erro Mistral:</strong> ${err.message}<br/>Gerando com motor local...`);
            const prof = generateProfileLocal(c);
            setProfile(prof);
            setPhase(4); setFlowSt('done'); flowRef.current = 'done';
            addMsg(`<div class="uv-q-badge">CONJURAÇÃO COMPLETA (local)</div><br/>✦ Perfil gerado com motor local.`);
            setOutputData(buildAllOutputData(prof));
        }
    }, [addMsg, settings]);

    /* ── Init ── */
    useEffect(() => {
        const t1 = setTimeout(() => {
            setTyping(true);
            const t2 = setTimeout(() => {
                setTyping(false);
                addMsg(`<div class="uv-q-badge">GRIMÓRIO VOCAL · VEO 3</div><br/>
                    Bem-vindo ao <strong>Umbra Voz</strong> — conjurador de arquiteturas vocais para vídeos gerados por IA.<br/><br/>
                    Responderei <em>uma pergunta por vez</em> para construir o perfil técnico completo, assistido pela <strong>Mistral AI</strong>.<br/><br/>
                    Vamos começar →`);
                setTimeout(() => askQuestion(0), 600);
            }, 1200);
            return () => clearTimeout(t2);
        }, 300);
        return () => clearTimeout(t1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ── Send handler ── */
    const handleSend = useCallback(async () => {
        const text = inputText.trim();
        if (!text || !enabled) return;
        setInputText('');
        addMsg(text, true);
        setEnabled(false);

        const fs = flowRef.current;
        const qi = qRef.current;
        const c = collRef.current;

        if (fs === 'questions') {
            const newC = { ...c, [QUESTIONS[qi].key]: text };
            setCollected(newC); collRef.current = newC;
            if (qi < QUESTIONS.length - 1) {
                askQuestion(qi + 1);
            } else {
                setTimeout(() => startConfirmation(), 50);
            }
        } else if (fs === 'confirmation') {
            if (/^(sim|s|yes|ok|confirma|certo|isso|perfeito|correto|tudo\s*bem|pode)/i.test(text)) {
                await startGeneration();
            } else {
                setTimeout(() => {
                    setTyping(true);
                    setTimeout(() => {
                        setTyping(false);
                        const fix = detectCorrection(text);
                        if (fix.key) {
                            const newC = { ...collRef.current, [fix.key]: fix.value };
                            setCollected(newC); collRef.current = newC;
                            addMsg(`✏️ Atualizado: <strong>${fix.label}</strong> → <em>${fix.value}</em><br/><br/>Confirma agora? Digite <strong>sim</strong>.`);
                        } else {
                            const cc = collRef.current;
                            addMsg(`Qual campo corrigir?<br/><br/><strong>Gênero:</strong> ${cc.genero}<br/><strong>Idade:</strong> ${cc.idade}<br/><strong>Origem:</strong> ${cc.regiao}<br/><strong>Frase:</strong> ${cc.frase}<br/><br/>Diga qual está errado e o valor correto.`);
                        }
                        setEnabled(true);
                    }, 800);
                }, 200);
            }
        }
    }, [inputText, enabled, addMsg, askQuestion, startConfirmation, startGeneration]);

    /* ── Reset ── */
    const resetChat = useCallback(() => {
        _msgId = 0;
        setPhase(1); setFlowSt('questions'); flowRef.current = 'questions';
        setCurrentQ(0); qRef.current = 0;
        const empty: Collected = { genero: '', idade: '', regiao: '', frase: '' };
        setCollected(empty); collRef.current = empty;
        setProfile(null); setMsgs([]); setTyping(false); setEnabled(false);
        setInputText(''); setOutputData(null); setActiveTab('json'); setVariant('standard');
        setTimeout(() => {
            setTyping(true);
            setTimeout(() => { setTyping(false); addMsg(`<div class="uv-q-badge">NOVA SESSÃO</div><br/>Nova sessão iniciada. →`); askQuestion(0); }, 1200);
        }, 300);
    }, [addMsg, askQuestion]);

    /* ── Saved voices ── */
    const saveVoice = useCallback(() => {
        if (!profile) return;
        const entry: SavedVoice = { id: Date.now(), profile, savedAt: new Date().toLocaleDateString('pt-BR') };
        const list = [...savedVoices, entry];
        setSavedVoices(list);
        localStorage.setItem('umbravoz_voices', JSON.stringify(list));
        showToast('Voz salva no grimório!', 'success');
    }, [profile, savedVoices, showToast]);

    const deleteVoice = useCallback((idx: number) => {
        const list = savedVoices.filter((_, i) => i !== idx);
        setSavedVoices(list);
        localStorage.setItem('umbravoz_voices', JSON.stringify(list));
        showToast('Voz removida', 'error');
    }, [savedVoices, showToast]);

    const loadVoice = useCallback((idx: number) => {
        const v = savedVoices[idx];
        setProfile(v.profile);
        const idv = v.profile.identidade_vocal || {};
        setCollected({ genero: idv.genero_vocal || '', idade: idv.idade_exata || '', regiao: idv.nationality || '', frase: v.profile._frase_referencia || '' });
        setOutputData(buildAllOutputData(v.profile));
        setPhase(4); setFlowSt('done'); flowRef.current = 'done';
        showToast('Voz carregada!', 'success');
    }, [savedVoices, showToast]);

    const copyText = (t: string) => navigator.clipboard.writeText(t).then(() => showToast('Copiado!', 'success'));
    const downloadT = (text: string, name: string) => { const b = new Blob([text], { type: 'text/plain;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; a.click(); showToast('Arquivo baixado!', 'success'); };

    /* ── Render ── */
    const phaseLabels = ['Identidade', 'Confirmação', 'Conjuração', 'Grimório'];

    return (
        <div className="umbravoz-root">

            {/* Phase bar */}
            <div className="uv-phase-bar">
                {phaseLabels.map((lbl, i) => {
                    const n = i + 1;
                    const cls = phase > n ? 'done' : phase === n ? 'active' : '';
                    return (
                        <div key={n} className={`uv-phase-step ${cls}`}>
                            <div className="uv-phase-dot">{['I', 'II', 'III', '✦'][i]}</div>
                            <span className="uv-phase-label">{lbl}</span>
                        </div>
                    );
                })}
            </div>

            {/* Body: chat + sidebar */}
            <div className="uv-body">

                {/* Chat column */}
                <div className="uv-chat-col">
                    <div className="uv-chat-box">
                        <div className="uv-chat-header">
                            <div className="uv-status-dot" />
                            <span className="uv-chat-status">VOICE_ARCHITECT · ACTIVE</span>
                            <span className="uv-ai-badge">MISTRAL AI</span>
                        </div>
                        <div className="uv-messages">
                            {msgs.map(m => (
                                <div key={m.id} className={`uv-msg ${m.isUser ? 'user' : 'bot'}`}>
                                    {m.isUser ? (
                                        <>
                                            <div className="uv-bubble uv-user-bubble">{m.html}</div>
                                            <div className="uv-avatar uv-user-avatar">VOC</div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="uv-avatar uv-bot-avatar">VA</div>
                                            <div className="uv-bubble uv-bot-bubble" dangerouslySetInnerHTML={{ __html: m.html }} />
                                        </>
                                    )}
                                </div>
                            ))}
                            {typing && (
                                <div className="uv-msg bot">
                                    <div className="uv-avatar uv-bot-avatar">VA</div>
                                    <div className="uv-bubble uv-bot-bubble"><div className="uv-typing-dots"><span /><span /><span /></div></div>
                                </div>
                            )}
                            <div ref={msgsEndRef} />
                        </div>
                        <div className="uv-input-area">
                            <textarea
                                value={inputText}
                                disabled={!enabled}
                                placeholder="Escreva sua resposta aqui..."
                                rows={1}
                                onChange={e => setInputText(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px'; }}
                            />
                            <button className="uv-send-btn" onClick={handleSend} disabled={!enabled || !inputText.trim()}>
                                <svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Collected data panel */}
                    {(collected.genero || collected.idade || collected.regiao) && (
                        <div className="uv-panel-box">
                            <div className="uv-panel-title">Dados Coletados</div>
                            <div className="uv-info-list">
                                {[['Gênero', collected.genero], ['Idade', collected.idade], ['Origem', collected.regiao], ['Frase', collected.frase]].map(([k, v]) => v && (
                                    <div key={k} className="uv-info-row">
                                        <span className="uv-info-key">{k}</span>
                                        <span className="uv-info-val">{(v as string).length > 42 ? (v as string).substring(0, 42) + '…' : v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="uv-sidebar-col">
                    <div className="uv-panel-box">
                        <div className="uv-panel-title">Vozes Salvas</div>
                        <div className="uv-voices-list">
                            {savedVoices.length === 0
                                ? <div className="uv-empty-state">Nenhuma voz conjurada ainda</div>
                                : savedVoices.map((v, i) => (
                                    <div key={v.id} className="uv-voice-card">
                                        <div className="uv-voice-name">{v.profile.identidade_vocal?.genero_vocal}, {v.profile.identidade_vocal?.idade_exata}</div>
                                        <div className="uv-voice-meta">{v.profile.identidade_vocal?.nationality} · {v.savedAt}</div>
                                        <div className="uv-voice-actions">
                                            <button className="uv-vc-btn" onClick={() => loadVoice(i)}>Carregar</button>
                                            <button className="uv-vc-btn danger" onClick={() => deleteVoice(i)}>✕</button>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                    <div className="uv-panel-box">
                        <div className="uv-panel-title">Ações</div>
                        <div className="uv-actions-panel">
                            <button className="uv-action-btn" onClick={resetChat}>✦ Nova Voz</button>
                            {profile && <button className="uv-action-btn gold" onClick={saveVoice}>★ Salvar Voz</button>}
                        </div>
                    </div>
                </div>

            </div>

            {/* Output section */}
            {outputData && (
                <div className="uv-output-section">
                    <div className="uv-output-panel">
                        <div className="uv-output-header">
                            <span className="uv-output-title">⟡ Grimório Vocal Completo</span>
                            <div className="uv-output-tabs">
                                {(['json', 'prompt', 'flow', 'ficha'] as TabName[]).map(t => (
                                    <button key={t} className={`uv-tab-btn ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
                                        {{ json: 'JSON', prompt: 'Prompt VEO 3', flow: 'Google Flow', ficha: 'Ficha' }[t]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {activeTab === 'json' && (
                            <div className="uv-tab-panel">
                                <pre className="uv-pre">{outputData.json}</pre>
                                <div className="uv-btn-row">
                                    <button className="uv-action-btn ghost" onClick={() => copyText(outputData.json)}>⎘ Copiar JSON</button>
                                    <button className="uv-action-btn ghost" onClick={() => downloadT(outputData.json, 'perfil_vocal.json')}>↓ Baixar JSON</button>
                                    <button className="uv-action-btn gold" onClick={saveVoice}>★ Salvar Voz</button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'prompt' && (
                            <div className="uv-tab-panel">
                                <div className="uv-prompt-note">Cole este bloco completo e idêntico em CADA prompt do VEO 3. Não modifique, não resuma.</div>
                                <div className="uv-variant-tabs">
                                    {(['standard', 'short', 'dramatic'] as Variant[]).map(v => (
                                        <button key={v} className={`uv-vtab ${variant === v ? 'active' : ''}`} onClick={() => setVariant(v)}>
                                            {{ standard: 'Padrão', short: 'Curto (≤8s)', dramatic: 'Dramático' }[v]}
                                        </button>
                                    ))}
                                </div>
                                <div className="uv-prompt-display">{outputData[variant]}</div>
                                <div className="uv-btn-row">
                                    <button className="uv-action-btn ghost" onClick={() => copyText(outputData[variant])}>⎘ Copiar Prompt</button>
                                    <button className="uv-action-btn ghost" onClick={() => downloadT(outputData[variant], `veo3_prompt_${variant}.txt`)}>↓ Baixar TXT</button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'flow' && (
                            <div className="uv-tab-panel">
                                <div className="uv-prompt-note">Otimizado para Google Flow / Veo 3.1 com Ingredients to Video. Use com imagem de referência do personagem.</div>
                                <div className="uv-prompt-display">{outputData.flow}</div>
                                <div className="uv-btn-row">
                                    <button className="uv-action-btn ghost" onClick={() => copyText(outputData.flow)}>⎘ Copiar</button>
                                    <button className="uv-action-btn ghost" onClick={() => downloadT(outputData.flow, 'google_flow.txt')}>↓ Baixar</button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'ficha' && (
                            <div className="uv-tab-panel">
                                <div className="uv-ficha" dangerouslySetInnerHTML={{ __html: buildFichaHTML(outputData.profile) }} />
                                <div className="uv-btn-row">
                                    <button className="uv-action-btn ghost" onClick={() => copyText(buildFichaText(outputData.profile))}>⎘ Copiar Ficha</button>
                                    <button className="uv-action-btn ghost" onClick={() => downloadT(buildFichaText(outputData.profile), 'ficha_vocal.txt')}>↓ Baixar TXT</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && <div className={`uv-toast uv-toast--${toast.type} uv-toast--show`}>{toast.msg}</div>}
        </div>
    );
};
