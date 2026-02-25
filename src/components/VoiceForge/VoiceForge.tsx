import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { AppSettings } from '../../types/prompt';
import './VoiceForge.css';

/* ─── Types ─── */
interface ChatMsg {
    role: 'bot' | 'user';
    html: string;
}

interface Collected {
    genero: string;
    idade: string;
    regiao: string;
    frase: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VoiceProfile = Record<string, any>;

interface SavedVoice {
    id: number;
    profile: VoiceProfile;
    savedAt: string;
}

type OutputVariant = 'standard' | 'short' | 'dramatic';
type ActiveTab = 'json' | 'prompt' | 'flow' | 'ficha' | 'compare';
type Phase = 1 | 2 | 3 | 4;

/* ─── Constants ─── */
const QUESTIONS = [
    {
        key: 'genero' as keyof Collected, label: 'PERGUNTA I — GÊNERO VOCAL',
        html: 'Qual o <strong>gênero vocal</strong> do personagem?',
        hint: 'Ex: masculino, feminino, andrógino'
    },
    {
        key: 'idade' as keyof Collected, label: 'PERGUNTA II — IDADE',
        html: 'Qual a <strong>idade exata</strong> do personagem?',
        hint: 'Ex: 28 anos, 45, 67'
    },
    {
        key: 'regiao' as keyof Collected, label: 'PERGUNTA III — ORIGEM',
        html: 'De qual <strong>região ou país</strong> ele é?',
        hint: 'Ex: São Paulo, Rio de Janeiro, Portugal, EUA, Argentina...'
    },
    {
        key: 'frase' as keyof Collected, label: 'PERGUNTA IV — O QUE DIZ',
        html: 'Qual <strong>frase ou ideia</strong> ele vai dizer no VEO 3?',
        hint: 'Cole a frase exata ou descreva o contexto da cena'
    },
];

/* ─── Mistral API ─── */
async function callMistral(apiKey: string, system: string, user: string): Promise<string> {
    const resp = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: 'mistral-large-latest',
            temperature: 0.4,
            max_tokens: 3000,
            messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        }),
    });
    if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { message?: string };
        throw new Error(err.message ?? `Erro ${resp.status}`);
    }
    const data = await resp.json() as { choices: { message: { content: string } }[] };
    return data.choices[0].message.content;
}

async function generateProfileMistral(apiKey: string, c: Collected): Promise<VoiceProfile> {
    const system = `Você é um especialista em fonoaudiologia, acústica vocal e design de personagens para vídeos gerados por IA (VEO 3 do Google). Gere perfis vocais técnicos extremamente detalhados e precisos. Responda APENAS com JSON válido, sem markdown, sem comentários.`;
    const user = `Gere um perfil vocal técnico completo para:
- Gênero vocal: ${c.genero}
- Idade: ${c.idade}
- Origem/Região: ${c.regiao}
- Frase de referência: "${c.frase}"

Retorne APENAS este JSON preenchido (sem markdown):
{
  "_perfil_vocal": "VoiceForge v2.0 — [resumo curto]",
  "_frase_referencia": "${c.frase}",
  "identidade_vocal": { "genero_vocal":"","idade_exata":"","nationality":"","sotaque":"","classe_social_refletida":"","arquetipo_vocal":"" },
  "arquitetura_acustica": { "frequencia_base_hz":"","faixa_confortavel_hz":"","pitch_medio":"","variacao_maxima_pitch":"","timbre":"","ressonancia_primaria":"","densidade_harmonica":"","nivel_aspereza":"","nivel_ar_na_voz":"","estabilidade":"","presenca_espectral":"" },
  "microtextura_sonora": { "micro_quebras":"","saliva_audivel":"","rugosidade":"","micro_pausas_ms":"","duracao_media_silaba_ms":"" },
  "padrao_respiratorio": { "tipo_respiracao":"","frequencia_respiratoria":"","respiracao_audivel":"","controle_de_folego":"" },
  "ritmo_dramatico": { "palavras_por_minuto":0,"duracao_pausa_dramatica_ms":"","ritmo_calmo":"","ritmo_sob_pressao":"","ritmo_sob_emocao_intensa":"" },
  "articulacao": { "precisao_consoantes":"","intensidade_plosivas":"","sibilancia":"","padrao_final_de_frase":"","especificidade_regional":"" },
  "dinamica_emocional": { "emocao_base":"","intensidade_base":"","variacao_sob_estresse":"","variacao_sob_alegria":"","variacao_sob_tristeza":"" },
  "assinatura_vocal": { "marca_sonora":"","padrao_pausa_exclusivo":"","frase_iconica":"${c.frase}","descricao_cinematografica":"" },
  "parametros_fixos_consistencia": { "pitch_central":"","variacao_maxima_permitida":"","velocidade_padrao_wpm":0,"nivel_fixo_ar":0.0,"nivel_fixo_rouquidao":0.0,"instrucao_veo3_curta":"","instrucao_veo3_completa":"" }
}`;
    const raw = await callMistral(apiKey, system, user);
    return JSON.parse(raw.replace(/```json|```/g, '').trim()) as VoiceProfile;
}

/* ─── Local fallback generator ─── */
function generateProfileLocal(c: Collected): VoiceProfile {
    const { genero, idade, regiao, frase } = c;
    const gLow = genero.toLowerCase();
    const isMale = /mascul|homem|male/.test(gLow);
    const isFemale = /femin|mulher|female/.test(gLow);
    const ageNum = parseInt(idade) || 30;
    const regLow = regiao.toLowerCase();

    let freqBase: string, faixaConf: string, pitch: string, timbre: string, ressonancia: string;
    if (isMale) {
        freqBase = ageNum < 25 ? '110-130 Hz' : ageNum > 55 ? '88-108 Hz' : '100-118 Hz';
        faixaConf = '80–165 Hz'; pitch = ageNum > 50 ? 'grave' : 'médio-grave';
        timbre = ageNum > 45 ? 'encorpado com aspereza maturada' : 'denso e encorpado';
        ressonancia = 'peitoral dominante com harmônicos sub-glóticos';
    } else if (isFemale) {
        freqBase = ageNum < 25 ? '200-225 Hz' : ageNum > 55 ? '160-185 Hz' : '180-210 Hz';
        faixaConf = '150–290 Hz'; pitch = ageNum < 25 ? 'médio-agudo' : 'médio a médio-agudo';
        timbre = ageNum > 45 ? 'aveludado com profundidade' : 'brilhante e expressivo';
        ressonancia = 'torácica com harmônicos nasais suaves';
    } else {
        freqBase = '145-170 Hz'; faixaConf = '120–250 Hz';
        pitch = 'médio fluido e indefinido'; timbre = 'híbrido andrógino';
        ressonancia = 'distribuída — peitoral e nasal equilibrados';
    }

    let sotaque: string, classe: string;
    if (/são paulo|sao paulo/.test(regLow)) { sotaque = 'Português brasileiro — paulistano neutro'; classe = 'classe média urbana — direto e articulado'; }
    else if (/rio/.test(regLow)) { sotaque = 'Carioca — vogais abertas, entonação melodiosa'; classe = 'carioca urbano — relaxado e expressivo'; }
    else if (/brasil|brazil/.test(regLow)) { sotaque = 'Português brasileiro neutro'; classe = 'urbano brasileiro contemporâneo'; }
    else if (/portugal|lisboa/.test(regLow)) { sotaque = 'Português europeu — fechado e gutural'; classe = 'europeu formal — eloquência clássica'; }
    else if (/eua|usa|estados unidos|american/.test(regLow)) { sotaque = 'American English — General American (Midwest-neutral)'; classe = 'American professional — direct and confident'; }
    else if (/uk|england|london|british/.test(regLow)) { sotaque = 'British RP — Received Pronunciation'; classe = 'British educated — precise and measured'; }
    else if (/argentin/.test(regLow)) { sotaque = 'Rioplatense — yeísmo rehilado, entonação italiana'; classe = 'portenho urbano — dramático e gesticulado'; }
    else { sotaque = `Neutro de ${regiao}`; classe = 'urbano contemporâneo'; }

    let wpm = 132;
    if (/rio/.test(regLow)) wpm = 148;
    else if (/brasil|são paulo/.test(regLow)) wpm = 140;
    else if (/uk|british|portugal/.test(regLow)) wpm = 122;
    else if (/argentin/.test(regLow)) wpm = 136;
    if (ageNum < 22) wpm += 14;
    if (ageNum > 58) wpm -= 14;

    const nivelAr = isFemale ? 0.12 : 0.08;
    const nivelRough = ageNum > 48 ? 0.28 : ageNum < 22 ? 0.05 : 0.12;

    return {
        _perfil_vocal: `VoiceForge v2.0 — ${genero}, ${idade}, ${regiao}`,
        _frase_referencia: frase,
        identidade_vocal: { genero_vocal: genero, idade_exata: idade, nationality: regiao, sotaque, classe_social_refletida: classe, arquetipo_vocal: isMale ? (ageNum > 45 ? 'mentor autoritário' : 'protagonista confiante') : (ageNum > 45 ? 'figura maternal sábia' : 'protagonista expressiva') },
        arquitetura_acustica: { frequencia_base_hz: freqBase, faixa_confortavel_hz: faixaConf, pitch_medio: pitch, variacao_maxima_pitch: isFemale ? '±80 Hz' : '±50 Hz', timbre, ressonancia_primaria: ressonancia, densidade_harmonica: isMale ? 'alta — harmônicos densos abaixo de 500 Hz' : 'média-alta — presença brilhante 1–3 kHz', nivel_aspereza: nivelRough + ' (0=suave, 1=rugoso)', nivel_ar_na_voz: nivelAr + ' (0=seco, 1=muito ar)', estabilidade: ageNum > 60 ? 'leve vibrato natural — 0.05 Hz' : 'estável com micro-variações orgânicas', presenca_espectral: isMale ? 'énfase em graves — caloroso e denso' : 'énfase em médios-agudos — claro e presente' },
        microtextura_sonora: { micro_quebras: ageNum > 55 ? 'presente — leve fissura em plosivas' : 'ausente — voz limpa', saliva_audivel: 'mínima — apenas em consoantes dentais', rugosidade: ageNum > 45 ? 'leve — textura maturada' : 'baixa — voz polida', micro_pausas_ms: '80–150 ms entre sintagmas', duracao_media_silaba_ms: Math.round(60000 / (wpm * 2.2)) + ' ms' },
        padrao_respiratorio: { tipo_respiracao: 'diafragmática — apoio de ar consistente', frequencia_respiratoria: ageNum < 25 ? 'alta — ciclos rápidos' : 'moderada — pausas de 3–5 s', respiracao_audivel: 'leve — perceptível no início de falas longas', controle_de_folego: ageNum > 35 ? 'alto — experiente' : 'médio — natural e espontâneo' },
        ritmo_dramatico: { palavras_por_minuto: wpm, duracao_pausa_dramatica_ms: '600–900 ms antes de palavras-chave', ritmo_calmo: (wpm - 20) + ' WPM — deliberado', ritmo_sob_pressao: (wpm + 25) + ' WPM — urgente e controlado', ritmo_sob_emocao_intensa: (wpm + 10) + ' WPM — intenso mas articulado' },
        articulacao: { precisao_consoantes: isFemale ? 'alta — finais definidos' : 'média-alta — naturalmente masculino', intensidade_plosivas: /brasil|brazil/.test(regLow) ? 'média — p/b/t/d brasileiros suaves' : 'alta — plosivas bem marcadas', sibilancia: /argentin|uruguai/.test(regLow) ? 'sh-ização característica — chiado rioplatense' : 'moderada', padrao_final_de_frase: 'descida gradual de pitch — assertivo e conclusivo', especificidade_regional: sotaque },
        dinamica_emocional: { emocao_base: 'neutro-confiante', intensidade_base: '0.65 / 1.0', variacao_sob_estresse: 'pitch +15–25 Hz, velocidade +18%, consoantes mais marcadas', variacao_sob_alegria: 'pitch +20–35 Hz, velocidade +12%, mais ar na voz', variacao_sob_tristeza: 'pitch -10–20 Hz, velocidade -15%, mais ar, menos ressonância' },
        assinatura_vocal: { marca_sonora: `voz ${isMale ? 'grave e autoritária' : 'clara e expressiva'} — reconhecível sem afetação`, padrao_pausa_exclusivo: 'pausa de 0.4 s antes de substantivos-chave', frase_iconica: frase, descricao_cinematografica: `Voz de ${isMale ? 'protagonista' : 'protagonista feminina'} — ${timbre}, ${sotaque}` },
        parametros_fixos_consistencia: { pitch_central: isMale ? (ageNum > 48 ? '100 Hz' : '110 Hz') : (ageNum > 48 ? '182 Hz' : '200 Hz'), variacao_maxima_permitida: isFemale ? '±75 Hz' : '±45 Hz', velocidade_padrao_wpm: wpm, nivel_fixo_ar: nivelAr, nivel_fixo_rouquidao: nivelRough, instrucao_veo3_curta: `${genero}, ${idade}, ${regiao}, ${sotaque}, pitch ${pitch}, ${wpm} WPM`, instrucao_veo3_completa: `Character is ${genero}, ${idade} years old, from ${regiao}. Voice: ${sotaque}. Pitch: ${pitch} (${freqBase}). Timbre: ${timbre}. ${wpm} WPM. Air: ${nivelAr}. Roughness: ${nivelRough}.` },
    };
}

/* ─── Prompt builders ─── */
function buildPromptVariant(p: VoiceProfile, variant: OutputVariant): string {
    const id = p.identidade_vocal, ac = p.arquitetura_acustica, rd = p.ritmo_dramatico, art = p.articulacao, fix = p.parametros_fixos_consistencia, br = p.padrao_respiratorio, frase: string = p._frase_referencia;
    if (variant === 'short') return `[VOICE LOCK — SHORT CLIP]
Character: ${id.genero_vocal}, ${id.idade_exata}, from ${id.nationality}
Accent: ${id.sotaque}
Pitch: ${ac.pitch_medio} (${ac.frequencia_base_hz}) | Timbre: ${ac.timbre}
Speed: ${rd.palavras_por_minuto} WPM | Air: ${fix.nivel_fixo_ar} | Roughness: ${fix.nivel_fixo_rouquidao}
Character says: "${frase}"
[END VOICE LOCK]`;
    if (variant === 'dramatic') return `[VOICE LOCK — DRAMATIC SCENE]
Character: ${id.genero_vocal}, ${id.idade_exata}, from ${id.nationality}
Accent: ${id.sotaque} | Class: ${id.classe_social_refletida}
Pitch: ${ac.pitch_medio} (${ac.frequencia_base_hz}) — never deviate beyond ${fix.variacao_maxima_permitida}
Timbre: ${ac.timbre} | Resonance: ${ac.ressonancia_primaria}
Air in voice: ${ac.nivel_ar_na_voz} | Roughness: ${ac.nivel_aspereza}
Speed: ${rd.ritmo_sob_emocao_intensa} | Dramatic pause: ${rd.duracao_pausa_dramatica_ms}
Breathing: ${br.tipo_respiracao} | Consonants: ${art.precisao_consoantes}
Character says with gravitas: "${frase}"
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
- Breathing: ${br.tipo_respiracao}
- Sentence endings: ${art.padrao_final_de_frase}

CONSISTENCY LOCK:
- Pitch center: ${fix.pitch_central} — never deviate beyond ${fix.variacao_maxima_permitida}
- Speed: always ${fix.velocidade_padrao_wpm} WPM at baseline
- Air level: ${fix.nivel_fixo_ar} | Roughness: ${fix.nivel_fixo_rouquidao}

CHARACTER SAYS:
"${frase}"

[END VOICE LOCK — DO NOT MODIFY THIS BLOCK]`;
}

function buildFlowPrompt(p: VoiceProfile): string {
    const id = p.identidade_vocal, ac = p.arquitetura_acustica, rd = p.ritmo_dramatico, fix = p.parametros_fixos_consistencia, br = p.padrao_respiratorio;
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
- Spectral presence: ${ac.presenca_espectral || 'balanced'}

DELIVERY LOCK:
- WPM: ${fix.velocidade_padrao_wpm}
- Air: ${fix.nivel_fixo_ar} | Roughness: ${fix.nivel_fixo_rouquidao}
- Breathing: ${br.tipo_respiracao}
- Rhythm: ${rd.ritmo_calmo} (calm) / ${rd.ritmo_sob_pressao} (pressured)

SCENE INSTRUCTION:
Character uses the EXACT same voice profile as previous scene.
Match pitch, timbre and delivery precisely.
Character says: "${p._frase_referencia}"

[ADD TO SCENE — maintain voice consistency across all clips]`;
}

/* ─── Component ─── */
interface VoiceForgeProps { settings: AppSettings }

export const VoiceForge: React.FC<VoiceForgeProps> = ({ settings }) => {
    const emptyCollected: Collected = { genero: '', idade: '', regiao: '', frase: '' };

    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [input, setInput] = useState('');
    const [inputEnabled, setInputEnabled] = useState(false);
    const [phase, setPhaseState] = useState<Phase>(1);
    const [currentQ, setCurrentQ] = useState(0);
    const [collected, setCollected] = useState<Collected>(emptyCollected);
    const [profile, setProfile] = useState<VoiceProfile | null>(null);
    const [loading, setLoading] = useState(false);

    const [activeTab, setActiveTab] = useState<ActiveTab>('json');
    const [activeVariant, setActiveVariant] = useState<OutputVariant>('standard');
    const [outputData, setOutputData] = useState<Record<string, string>>({});
    const [showOutput, setShowOutput] = useState(false);

    const [savedVoices, setSavedVoices] = useState<SavedVoice[]>(() => {
        try { return JSON.parse(localStorage.getItem('voiceforge_voices') || '[]') as SavedVoice[]; }
        catch { return []; }
    });
    const [compareSelected, setCompareSelected] = useState<number[]>([]);
    const [copiedTab, setCopiedTab] = useState<string | null>(null);

    const collectedRef = useRef<Collected>(emptyCollected);
    const phaseRef = useRef<Phase>(1);
    const currentQRef = useRef(0);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const outputRef = useRef<HTMLDivElement>(null);

    /* sync refs */
    useEffect(() => { collectedRef.current = collected; }, [collected]);
    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { currentQRef.current = currentQ; }, [currentQ]);

    /* scroll chat */
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

    /* scroll output into view */
    useEffect(() => {
        if (showOutput) setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }, [showOutput]);

    const addMsg = useCallback((html: string, role: 'bot' | 'user' = 'bot') => {
        setMessages(prev => [...prev, { role, html }]);
    }, []);

    const withDelay = (fn: () => void, ms = 900) => new Promise<void>(r => setTimeout(() => { fn(); r(); }, ms));

    /* ─── Init ─── */
    const init = useCallback(async () => {
        setMessages([]);
        setInput('');
        setInputEnabled(false);
        setPhaseState(1);
        setCurrentQ(0);
        setCollected(emptyCollected);
        collectedRef.current = emptyCollected;
        setProfile(null);
        setShowOutput(false);
        setOutputData({});
        setCompareSelected([]);

        await withDelay(() => { }, 300);
        setLoading(true);
        await withDelay(() => { }, 700);
        setLoading(false);
        addMsg(`<div class="vf-q-badge">GRIMÓRIO VOCAL · VEO 3</div>
Bem-vindo ao <strong>VoiceForge</strong> — o conjurador de arquiteturas vocais para vídeos gerados por IA.<br><br>
Responderei <em>uma pergunta por vez</em> para construir o perfil técnico completo da sua voz com precisão máxima, assistido pela <strong>Mistral AI</strong>.<br><br>
Vamos começar com a primeira pergunta →`);
        await withDelay(() => { }, 400);
        askQuestion(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { init(); }, [init]);

    const askQuestion = (idx: number) => {
        if (idx >= QUESTIONS.length) { startConfirmation(); return; }
        setCurrentQ(idx);
        currentQRef.current = idx;
        setPhaseState(1);
        phaseRef.current = 1;
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            const q = QUESTIONS[idx];
            addMsg(`<div class="vf-q-badge">${q.label}</div>
<div class="vf-single-q">${q.html}</div>
<br><span class="vf-hint">Ex: ${q.hint}</span>`);
            setInputEnabled(true);
            textareaRef.current?.focus();
        }, 700);
    };

    const startConfirmation = () => {
        setPhaseState(2);
        phaseRef.current = 2;
        setInputEnabled(false);
        setLoading(true);
        const d = collectedRef.current;
        setTimeout(() => {
            setLoading(false);
            addMsg(`<div class="vf-q-badge">CONFIRMAÇÃO — REVISÃO DOS DADOS</div>
Ótimo! Estes são os dados coletados:<br><br>
<strong>Gênero vocal:</strong> ${d.genero}<br>
<strong>Idade:</strong> ${d.idade}<br>
<strong>Origem:</strong> ${d.regiao}<br>
<strong>Frase:</strong> <em>"${d.frase}"</em><br><br>
Confirma? Digite <strong>sim</strong> para conjurar o perfil, ou diga o que precisa corrigir.`);
            setInputEnabled(true);
        }, 900);
    };

    const startGeneration = async () => {
        setPhaseState(3);
        setInputEnabled(false);
        addMsg(`<span class="vf-thinking">✦ Consultando os arquivos da Mistral AI...</span>`);
        let generatedProfile: VoiceProfile;
        if (settings.apiKey) {
            try {
                generatedProfile = await generateProfileMistral(settings.apiKey, collectedRef.current);
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Erro inesperado';
                addMsg(`⚠️ <strong>Erro Mistral:</strong> ${msg}<br><br>Gerando com motor local como fallback...`);
                generatedProfile = generateProfileLocal(collectedRef.current);
            }
        } else {
            addMsg('⚠️ <strong>API Key não configurada.</strong> Gerando com motor local...');
            await new Promise(r => setTimeout(r, 600));
            generatedProfile = generateProfileLocal(collectedRef.current);
        }
        finishGeneration(generatedProfile);
    };

    const finishGeneration = (p: VoiceProfile) => {
        setProfile(p);
        setPhaseState(4);
        const d = collectedRef.current;
        const builtData: Record<string, string> = {
            json: JSON.stringify(p, null, 2),
            standard: buildPromptVariant(p, 'standard'),
            short: buildPromptVariant(p, 'short'),
            dramatic: buildPromptVariant(p, 'dramatic'),
            flow: buildFlowPrompt(p),
        };
        setOutputData(builtData);
        setActiveVariant('standard');
        setActiveTab('json');
        setShowOutput(true);
        addMsg(`<div class="vf-q-badge">CONJURAÇÃO COMPLETA</div>
✦ <strong>Grimório vocal gerado com sucesso!</strong><br><br>
O perfil de <em>${d.genero}, ${d.idade}, ${d.regiao}</em> está disponível abaixo em JSON, Prompt VEO 3, Google Flow e Ficha Técnica.`);
    };

    /* ─── Handle send ─── */
    const handleSend = useCallback(async () => {
        const text = input.trim();
        if (!text || !inputEnabled || loading) return;
        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        addMsg(text, 'user');
        setInputEnabled(false);

        if (phaseRef.current === 1) {
            const qIdx = currentQRef.current;
            const key = QUESTIONS[qIdx].key;
            const newColl = { ...collectedRef.current, [key]: text };
            setCollected(newColl);
            collectedRef.current = newColl;
            if (qIdx < QUESTIONS.length - 1) askQuestion(qIdx + 1);
            else startConfirmation();
        } else {
            const lower = text.toLowerCase();
            if (/^(sim|s|yes|ok|confirma|certo|isso|perfeito|correto|tudo\s*bem|pode)/.test(lower)) {
                await startGeneration();
            } else {
                // Try correction detection
                setLoading(true);
                setTimeout(() => {
                    setLoading(false);
                    const d = collectedRef.current;
                    addMsg(`Qual campo você quer corrigir?<br><br>
<strong>Gênero:</strong> ${d.genero}<br>
<strong>Idade:</strong> ${d.idade}<br>
<strong>Origem:</strong> ${d.regiao}<br>
<strong>Frase:</strong> ${d.frase}<br><br>
Diga qual está errado e o valor correto, depois confirme com <strong>sim</strong>.`);
                    setInputEnabled(true);
                }, 700);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [input, inputEnabled, loading]);

    const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    /* ─── Save / load voices ─── */
    const saveCurrentVoice = () => {
        if (!profile) return;
        const entry: SavedVoice = { id: Date.now(), profile, savedAt: new Date().toLocaleDateString('pt-BR') };
        const updated = [...savedVoices, entry];
        setSavedVoices(updated);
        localStorage.setItem('voiceforge_voices', JSON.stringify(updated));
    };

    const deleteVoice = (idx: number) => {
        const updated = savedVoices.filter((_, i) => i !== idx);
        setSavedVoices(updated);
        localStorage.setItem('voiceforge_voices', JSON.stringify(updated));
    };

    const loadVoice = (idx: number) => {
        const v = savedVoices[idx];
        const c: Collected = { genero: v.profile.identidade_vocal.genero_vocal, idade: v.profile.identidade_vocal.idade_exata, regiao: v.profile.identidade_vocal.nationality, frase: v.profile._frase_referencia };
        collectedRef.current = c;
        setCollected(c);
        const builtData: Record<string, string> = {
            json: JSON.stringify(v.profile, null, 2),
            standard: buildPromptVariant(v.profile, 'standard'),
            short: buildPromptVariant(v.profile, 'short'),
            dramatic: buildPromptVariant(v.profile, 'dramatic'),
            flow: buildFlowPrompt(v.profile),
        };
        setProfile(v.profile);
        setOutputData(builtData);
        setShowOutput(true);
    };

    const exportVoice = (idx: number) => {
        const v = savedVoices[idx];
        const blob = new Blob([JSON.stringify(v.profile, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `voz_${v.profile.identidade_vocal.genero_vocal}_${String(v.profile.identidade_vocal.idade_exata).replace(' ', '')}.json`;
        a.click();
    };

    /* ─── Copy / download ─── */
    const copyContent = (key: string) => {
        const text = key === 'prompt' ? (outputData[activeVariant] ?? '') : (outputData[key] ?? '');
        navigator.clipboard.writeText(text).then(() => {
            setCopiedTab(key);
            setTimeout(() => setCopiedTab(null), 2000);
        });
    };

    const downloadContent = (key: string, ext: string) => {
        const text = key === 'prompt' ? (outputData[activeVariant] ?? '') : (outputData[key] ?? '');
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `voiceforge_${key}.${ext}`;
        a.click();
    };

    /* ─── Render ficha ─── */
    const renderFichaHTML = (p: VoiceProfile) => {
        const sections = [
            { title: 'Identidade', rows: [['Gênero', p.identidade_vocal.genero_vocal], ['Idade', p.identidade_vocal.idade_exata], ['Origem', p.identidade_vocal.nationality], ['Sotaque', p.identidade_vocal.sotaque], ['Classe social', p.identidade_vocal.classe_social_refletida], ['Arquétipo', p.identidade_vocal.arquetipo_vocal]] },
            { title: 'Arquitetura Acústica', rows: [['Freq. base', p.arquitetura_acustica.frequencia_base_hz], ['Pitch médio', p.arquitetura_acustica.pitch_medio], ['Timbre', p.arquitetura_acustica.timbre], ['Ressonância', p.arquitetura_acustica.ressonancia_primaria], ['Ar na voz', p.arquitetura_acustica.nivel_ar_na_voz], ['Rouquidão', p.arquitetura_acustica.nivel_aspereza]] },
            { title: 'Ritmo & Entrega', rows: [['WPM padrão', p.ritmo_dramatico.palavras_por_minuto], ['Ritmo calmo', p.ritmo_dramatico.ritmo_calmo], ['Sob pressão', p.ritmo_dramatico.ritmo_sob_pressao], ['Pausa dramática', p.ritmo_dramatico.duracao_pausa_dramatica_ms]] },
            { title: 'Parâmetros Fixos', rows: [['Pitch central', p.parametros_fixos_consistencia.pitch_central], ['Variação máx.', p.parametros_fixos_consistencia.variacao_maxima_permitida], ['WPM fixo', p.parametros_fixos_consistencia.velocidade_padrao_wpm], ['Ar fixo', p.parametros_fixos_consistencia.nivel_fixo_ar], ['Rouquidão fixa', p.parametros_fixos_consistencia.nivel_fixo_rouquidao]] },
        ];
        return sections.map((s, si) => (
            <div key={si} className="vf-ficha-section">
                <div className="vf-ficha-hdr">{s.title}</div>
                {s.rows.map(([k, v], ri) => (
                    <div key={ri} className="vf-ficha-row">
                        <span className="vf-ficha-key">{k}</span>
                        <span className="vf-ficha-val">{String(v ?? '—')}</span>
                    </div>
                ))}
            </div>
        ));
    };

    /* ─── Compare ─── */
    const toggleCompare = (idx: number) => {
        setCompareSelected(prev => {
            if (prev.includes(idx)) return prev.filter(i => i !== idx);
            if (prev.length >= 2) return prev;
            return [...prev, idx];
        });
    };

    /* ─── UI ─── */
    return (
        <div className="vf-wrap">

            {/* Header */}
            <div className="vf-header">
                <div className="vf-logo-tag">◆ VEO 3 · VOICE ENGINE ◆</div>
                <div className="vf-sigil">
                    <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="30" cy="30" r="28" stroke="#8b6914" strokeWidth="1" />
                        <circle cx="30" cy="30" r="22" stroke="#c9a84c" strokeWidth="0.5" strokeDasharray="3 3" />
                        <polygon points="30,6 54,42 6,42" fill="none" stroke="#c9a84c" strokeWidth="1" />
                        <circle cx="30" cy="30" r="4" fill="#c9a84c" opacity="0.6" />
                        <text x="30" y="35" textAnchor="middle" fill="#f0d080" fontFamily="serif" fontSize="8">V3</text>
                    </svg>
                </div>
                <h2 className="vf-title">VoiceForge</h2>
                <div className="vf-divider" />
                <p className="vf-sub">Grimório de Arquitetura Vocal para VEO 3 — Powered by Mistral AI</p>
            </div>

            {/* Phase bar */}
            <div className="vf-phase-bar">
                {(['Identidade', 'Confirmação', 'Conjuração', 'Grimório'] as const).map((label, i) => {
                    const n = i + 1;
                    const cls = n < phase ? 'done' : n === phase ? 'active' : '';
                    return (
                        <div key={n} className={`vf-phase-step ${cls}`}>
                            <div className="vf-phase-dot">{['I', 'II', 'III', 'IV'][i]}</div>
                            <span className="vf-phase-label">{label}</span>
                        </div>
                    );
                })}
            </div>

            {/* Main grid */}
            <div className="vf-grid">

                {/* Chat column */}
                <div className="vf-chat-col">
                    <div className="vf-chat-box">
                        <div className="vf-chat-hdr">
                            <div className="vf-chat-hdr-left">
                                <div className="vf-status-dot" />
                                <span className="vf-chat-status">VOICE_ARCHITECT · ACTIVE</span>
                            </div>
                            <span className="vf-ai-badge">MISTRAL AI</span>
                        </div>

                        <div className="vf-messages">
                            {messages.map((m, i) => (
                                <div key={i} className={`vf-msg vf-msg-${m.role}`}>
                                    <div className={`vf-avatar ${m.role === 'bot' ? 'vf-bot-av' : 'vf-user-av'}`}>{m.role === 'bot' ? 'VA' : 'VCL'}</div>
                                    <div className={`vf-bubble ${m.role === 'bot' ? 'vf-bot-bubble' : 'vf-user-bubble'}`} dangerouslySetInnerHTML={{ __html: m.html }} />
                                </div>
                            ))}
                            {loading && (
                                <div className="vf-msg vf-msg-bot">
                                    <div className="vf-avatar vf-bot-av">VA</div>
                                    <div className="vf-bubble vf-bot-bubble"><div className="vf-typing"><span /><span /><span /></div></div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        <div className="vf-input-area">
                            <textarea
                                ref={textareaRef}
                                className="vf-textarea"
                                placeholder="Escreva sua resposta aqui..."
                                rows={1}
                                value={input}
                                disabled={!inputEnabled || loading}
                                onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
                                onKeyDown={handleKey}
                            />
                            <button className="vf-send-btn" onClick={handleSend} disabled={!inputEnabled || !input.trim() || loading} title="Enviar">
                                <svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Collected data panel */}
                    {(collected.genero || collected.idade) && (
                        <div className="vf-panel-box">
                            <div className="vf-panel-title">Dados Coletados</div>
                            <div className="vf-info-list">
                                {([['Gênero', collected.genero], ['Idade', collected.idade], ['Origem', collected.regiao], ['Frase', collected.frase ? `"${collected.frase.slice(0, 40)}${collected.frase.length > 40 ? '…' : ''}"` : '']] as [string, string][]).map(([k, v]) => v ? (
                                    <div key={k} className="vf-info-row">
                                        <span className="vf-info-key">{k}</span>
                                        <span className="vf-info-val">{v}</span>
                                    </div>
                                ) : null)}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="vf-sidebar">
                    {/* API status */}
                    <div className="vf-panel-box">
                        <div className="vf-panel-title">Status da API</div>
                        <div className="vf-api-status-row">
                            <div className={`vf-api-dot ${settings.apiKey ? 'ok' : 'err'}`} />
                            <span className="vf-api-status-txt">{settings.apiKey ? 'Chave ativa — Mistral AI pronto' : 'Sem chave — usando motor local'}</span>
                        </div>
                        {!settings.apiKey && <p className="vf-api-hint">Configure em ⚙ Configurações para usar a IA completa.</p>}
                    </div>

                    {/* Saved voices */}
                    <div className="vf-panel-box">
                        <div className="vf-panel-title">Vozes Salvas</div>
                        <div className="vf-voices-list">
                            {savedVoices.length === 0
                                ? <div className="vf-empty">Nenhuma voz conjurada ainda</div>
                                : savedVoices.map((v, i) => (
                                    <div key={v.id} className="vf-voice-card">
                                        <div className="vf-voice-name">{v.profile.identidade_vocal.genero_vocal}, {v.profile.identidade_vocal.idade_exata}</div>
                                        <div className="vf-voice-meta">{v.profile.identidade_vocal.nationality} · {v.savedAt}</div>
                                        <div className="vf-voice-actions">
                                            <button className="vf-vc-btn" onClick={() => loadVoice(i)}>Carregar</button>
                                            <button className="vf-vc-btn" onClick={() => exportVoice(i)}>Exportar</button>
                                            <button className="vf-vc-btn vf-danger" onClick={() => deleteVoice(i)}>✕</button>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="vf-panel-box">
                        <div className="vf-panel-title">Ações</div>
                        <div className="vf-actions">
                            <button className="vf-action-btn" onClick={init}>✦ Nova Voz</button>
                            {showOutput && <button className="vf-action-btn" onClick={() => { setActiveTab('compare'); outputRef.current?.scrollIntoView({ behavior: 'smooth' }); }}>⟡ Comparar Vozes</button>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Output */}
            {showOutput && profile && (
                <div className="vf-output" ref={outputRef}>
                    <div className="vf-output-panel">
                        <div className="vf-output-hdr">
                            <span className="vf-output-title">⟡ Grimório Vocal Completo</span>
                            <div className="vf-output-tabs">
                                {(['json', 'prompt', 'flow', 'ficha', 'compare'] as ActiveTab[]).map(t => (
                                    <button key={t} className={`vf-tab-btn ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>{t === 'json' ? 'JSON' : t === 'prompt' ? 'Prompt VEO 3' : t === 'flow' ? 'Google Flow' : t === 'ficha' ? 'Ficha' : 'Comparar'}</button>
                                ))}
                            </div>
                        </div>

                        {/* JSON */}
                        {activeTab === 'json' && (
                            <div className="vf-tab-panel">
                                <pre className="vf-pre">{outputData.json}</pre>
                                <div className="vf-btn-row">
                                    <button className="vf-out-btn" onClick={() => copyContent('json')}>{copiedTab === 'json' ? '✓ Copiado' : '⎘ Copiar JSON'}</button>
                                    <button className="vf-out-btn" onClick={() => downloadContent('json', 'json')}>↓ Baixar JSON</button>
                                    <button className="vf-out-btn vf-btn-solid" onClick={saveCurrentVoice}>★ Salvar Voz</button>
                                </div>
                            </div>
                        )}

                        {/* Prompt VEO 3 */}
                        {activeTab === 'prompt' && (
                            <div className="vf-tab-panel">
                                <p className="vf-prompt-note">⚠ Cole este bloco completo e idêntico em CADA prompt do VEO 3. Não modifique, não resuma.</p>
                                <div className="vf-variant-tabs">
                                    {(['standard', 'short', 'dramatic'] as OutputVariant[]).map(v => (
                                        <button key={v} className={`vf-vtab ${activeVariant === v ? 'active' : ''}`} onClick={() => setActiveVariant(v)}>{v === 'standard' ? 'Padrão' : v === 'short' ? 'Curto (≤8s)' : 'Dramático'}</button>
                                    ))}
                                </div>
                                <div className="vf-prompt-display">{outputData[activeVariant]}</div>
                                <div className="vf-btn-row">
                                    <button className="vf-out-btn" onClick={() => copyContent('prompt')}>{copiedTab === 'prompt' ? '✓ Copiado' : '⎘ Copiar Prompt'}</button>
                                    <button className="vf-out-btn" onClick={() => downloadContent('prompt', 'txt')}>↓ Baixar TXT</button>
                                </div>
                            </div>
                        )}

                        {/* Google Flow */}
                        {activeTab === 'flow' && (
                            <div className="vf-tab-panel">
                                <p className="vf-prompt-note">⚠ Otimizado para Google Flow / Veo 3.1 com Ingredients to Video. Use junto de uma imagem de referência do personagem.</p>
                                <div className="vf-prompt-display">{outputData.flow}</div>
                                <div className="vf-btn-row">
                                    <button className="vf-out-btn" onClick={() => copyContent('flow')}>{copiedTab === 'flow' ? '✓ Copiado' : '⎘ Copiar'}</button>
                                    <button className="vf-out-btn" onClick={() => downloadContent('flow', 'txt')}>↓ Baixar</button>
                                </div>
                            </div>
                        )}

                        {/* Ficha */}
                        {activeTab === 'ficha' && (
                            <div className="vf-tab-panel">
                                {renderFichaHTML(profile)}
                                <div className="vf-ficha-section">
                                    <div className="vf-ficha-hdr">Frase de Referência</div>
                                    <p className="vf-ficha-frase">"{profile._frase_referencia}"</p>
                                </div>
                                <div className="vf-btn-row">
                                    <button className="vf-out-btn" onClick={() => copyContent('ficha')}>⎘ Copiar Ficha</button>
                                </div>
                            </div>
                        )}

                        {/* Compare */}
                        {activeTab === 'compare' && (
                            <div className="vf-tab-panel">
                                {savedVoices.length < 2
                                    ? <p className="vf-empty-compare">Salve pelo menos 2 vozes para comparar.</p>
                                    : <>
                                        <p className="vf-cmp-hint">Selecione duas vozes para comparar:</p>
                                        <div className="vf-compare-grid">
                                            {savedVoices.map((v, i) => (
                                                <div key={v.id} className={`vf-cmp-card ${compareSelected.includes(i) ? 'selected' : ''}`} onClick={() => toggleCompare(i)}>
                                                    <div className="vf-cmp-name">{v.profile.identidade_vocal.genero_vocal}, {v.profile.identidade_vocal.idade_exata}</div>
                                                    <div className="vf-cmp-meta">{v.profile.identidade_vocal.nationality} · {v.savedAt}</div>
                                                </div>
                                            ))}
                                        </div>
                                        {compareSelected.length === 2 && (() => {
                                            const a = savedVoices[compareSelected[0]].profile, b = savedVoices[compareSelected[1]].profile;
                                            const rows: [string, string, string][] = [
                                                ['Gênero', a.identidade_vocal.genero_vocal, b.identidade_vocal.genero_vocal],
                                                ['Idade', a.identidade_vocal.idade_exata, b.identidade_vocal.idade_exata],
                                                ['Origem', a.identidade_vocal.nationality, b.identidade_vocal.nationality],
                                                ['Sotaque', a.identidade_vocal.sotaque, b.identidade_vocal.sotaque],
                                                ['Freq. base', a.arquitetura_acustica.frequencia_base_hz, b.arquitetura_acustica.frequencia_base_hz],
                                                ['Pitch', a.arquitetura_acustica.pitch_medio, b.arquitetura_acustica.pitch_medio],
                                                ['Timbre', a.arquitetura_acustica.timbre, b.arquitetura_acustica.timbre],
                                                ['WPM', String(a.parametros_fixos_consistencia.velocidade_padrao_wpm), String(b.parametros_fixos_consistencia.velocidade_padrao_wpm)],
                                                ['Ar', String(a.parametros_fixos_consistencia.nivel_fixo_ar), String(b.parametros_fixos_consistencia.nivel_fixo_ar)],
                                            ];
                                            return (
                                                <table className="vf-cmp-table">
                                                    <thead><tr>
                                                        <th>Parâmetro</th>
                                                        <th>{a.identidade_vocal.genero_vocal} · {a.identidade_vocal.idade_exata}</th>
                                                        <th>{b.identidade_vocal.genero_vocal} · {b.identidade_vocal.idade_exata}</th>
                                                    </tr></thead>
                                                    <tbody>
                                                        {rows.map(([k, va, vb]) => (
                                                            <tr key={k}>
                                                                <td>{k}</td>
                                                                <td style={va !== vb ? { color: 'var(--vf-gold)' } : {}}>{va}</td>
                                                                <td style={va !== vb ? { color: 'var(--vf-gold)' } : {}}>{vb}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            );
                                        })()}
                                    </>
                                }
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
