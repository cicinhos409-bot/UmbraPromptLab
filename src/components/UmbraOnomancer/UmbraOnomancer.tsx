import React, { useState, useEffect, useRef } from 'react';
import './UmbraOnomancer.css';

interface AnimeName { title: string; synopsis: string; score: number; }
interface HistoryEntry { date: string; names: AnimeName[]; data: AnimeData; }
interface AnimeData {
    animeType?: string; pattern?: string; genre?: string; tone?: string;
    protagonist?: string; companions?: string; power?: string; setting?: string;
    goal?: string; twist?: string; keywords?: string;
}
type GeneratorMode = 'normal' | 'meme' | 'random';
type ActiveTab = 'chat' | 'examples' | 'history';
interface ChatMsg {
    type: 'bot' | 'user'; text: string;
    options?: string[] | null; animeNames?: AnimeName[] | null;
    isTextInput?: boolean; placeholder?: string;
}

const QUESTIONS: { id: keyof AnimeData; text: string; options?: string[]; type?: string; placeholder?: string; }[] = [
    { id: 'animeType', text: 'Qual tipo de anime você quer criar?', options: ['Shounen', 'Seinen', 'Shoujo', 'Isekai', 'Slice of Life', 'Dark Fantasy'] },
    { id: 'pattern', text: 'Qual fórmula/padrão você quer usar?', options: ['Expulso → Sucesso', 'Slow Life', 'Isekai Profissional', 'Reencarnação Incomum', 'OP mas Humilde', 'Vilã Nobre', 'Título Chinês Curto'] },
    { id: 'genre', text: 'Qual é o gênero principal?', options: ['Isekai', 'Fantasia', 'Ação', 'Romance', 'Aventura', 'Comédia'] },
    { id: 'tone', text: 'Qual é o tom da história?', options: ['Comédia', 'Dark/Sombrio', 'Dramático', 'Leve/Fofo', 'Épico', 'Misterioso'] },
    { id: 'protagonist', text: 'Quem é o protagonista?', options: ['Herói Comum', 'Vilão/Vilã', 'Reencarnado', 'Expulso do Grupo', 'Nobre', 'Aventureiro'] },
    { id: 'companions', text: 'O protagonista tem companions?', options: ['Harém', 'Mascote Fofo', 'Rival', 'Grupo de Amigos', 'Sozinho', 'Mestre/Mentor'] },
    { id: 'power', text: 'Qual é a habilidade especial?', options: ['Magia', 'Habilidade Oculta', 'Sistema/Cheat', 'Poder Divino', 'Skill Única', 'Sem Poderes'] },
    { id: 'setting', text: 'Onde se passa a história?', options: ['Reino Mágico', 'Outro Mundo', 'Academia', 'Dungeons', 'Reino Corrupto', 'Mundo Moderno'] },
    { id: 'goal', text: 'Qual é o objetivo principal?', options: ['Vingança', 'Vida Tranquila', 'Salvar o Mundo', 'Ficar Mais Forte', 'Evitar Destino', 'Construir Reino'] },
    { id: 'twist', text: 'Qual é a reviravolta?', options: ['Na verdade é o mais forte', 'Todos subestimam', 'Segredo do passado', 'Habilidade quebrada', 'Destino especial', 'Nenhuma'] },
    { id: 'keywords', text: 'Palavras-chave para o título (opcional):', type: 'text', placeholder: 'Ex: dragão, necromante, imperador...' },
];

const REAL_EXAMPLES = [
    { title: 'Tensei shitara Slime Datta Ken', rating: 8.1, pattern: 'Reencarnação Incomum' },
    { title: 'Kage no Jitsuryokusha ni Naritakute!', rating: 7.9, pattern: 'OP mas Humilde' },
    { title: 'Mushoku Tensei: Isekai Ittara Honki Dasu', rating: 8.4, pattern: 'Isekai' },
    { title: 'Shin no Nakama ja Nai to Yuusha no Party wo Oidasareta node', rating: 7.2, pattern: 'Expulso → Sucesso' },
    { title: 'Isekai Nonbiri Nouka', rating: 7.2, pattern: 'Slow Life' },
    { title: 'Isekai Yakkyoku', rating: 7.6, pattern: 'Isekai Profissional' },
    { title: 'Tensei Shitara Ken Deshita', rating: 7.1, pattern: 'Reencarnação Incomum' },
    { title: 'Akuyaku Reijou nanode Last Boss wo Kattemimashita', rating: 7.4, pattern: 'Vilã Nobre' },
    { title: 'Party kara Tsuihou sareta Sono Chiyushi, Jitsu wa Saikyou', rating: 6.8, pattern: 'Expulso → Sucesso' },
    { title: 'Quanzhi Fashi', rating: 7.4, pattern: 'Título Chinês' },
    { title: 'Gaikotsu Kishi-sama, Tadaima Isekai e Odekakechuu', rating: 7.2, pattern: 'Reencarnação Incomum' },
    { title: 'Tsuki ga Michibiku Isekai Douchuu', rating: 7.4, pattern: 'Isekai' },
];

/* -- name generation helpers -- */
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

const KW_MAP: Record<string, string> = { dragão: 'Dragon', dragao: 'Dragon', slime: 'Slime', 'demônio': 'Akuma', demonio: 'Akuma', esqueleto: 'Gaikotsu', vampiro: 'Kyuuketsuki', lobo: 'Ookami', 'fênix': 'Fushichou', fenix: 'Fushichou', necromante: 'Necromancer', mago: 'Mahoutsukai', guerreiro: 'Senshi', cavaleiro: 'Kishi', assassino: 'Ansatsusha', 'herói': 'Yuusha', heroi: 'Yuusha', fazendeiro: 'Nouka', alquimista: 'Renkinjutsushi', 'farmacêutico': 'Yakkyokushi', farmaceutico: 'Yakkyokushi', imperador: 'Teiou', rei: 'Ou', rainha: 'Joou', 'príncipe': 'Ouji', principe: 'Ouji', princesa: 'Hime', nobre: 'Kizoku', duque: 'Koushaku', espada: 'Ken', magia: 'Mahou', deus: 'Kami', sombra: 'Kage', luz: 'Hikari', trevas: 'Yami', morte: 'Shi', dungeon: 'Meikyuu', masmorra: 'Meikyuu', academia: 'Gakuen', reino: 'Oukoku', 'império': 'Teikoku', imperio: 'Teikoku', portal: 'Gate', torre: 'Tou' };
const transKw = (k: string) => KW_MAP[k.toLowerCase()] ?? k;

function makeTitle(data: AnimeData, mode: GeneratorMode): string {
    const kw = (data.keywords ?? '').split(',').map(s => s.trim()).filter(Boolean);
    if (mode === 'meme') {
        const p = pick(['Shinjiteita Nakamatachi ni Dungeon Okuchi de Korosarekaketa ga', 'Omae Gotoki ga Maou ni Kateru to Omouna to Yuusha Party wo Tsuihou sareta node']);
        const s = pick(['Level 9999 no Nakamatachi wo Te ni Irete Moto Party Member to Sekai ni Fukushuu & Zamaa Shimasu', 'Jitsu wa Saikyou Sugite Sekai no Subete wo Shihai Dekiru Koto ni Kidzuite Shimatta Ken']);
        return `${p}, ${s}`;
    }
    switch (data.pattern) {
        case 'Expulso → Sucesso': {
            const e = pick(['Yuusha Party wo Tsuihou sareta', 'Party kara Tsuihou sareta node', 'Shin no Nakama ja Nai to Yuusha no Party wo Oidasareta node', 'Yakutatazu to Tsuihou sareta']);
            const s = pick(['Jitsu wa Saikyou deshita', 'S-Rank Boukensha ni Hirowareru', 'Henkyou de Slow Life suru Koto ni Shimashita', 'Saikyou ni Natte Fukushuu Shimasu']);
            return `${e}, ${s}`;
        }
        case 'Slow Life': {
            const pr = pick(['Nouka', 'Yakkyoku', 'Ryoushi', 'Kajiya', 'Ryourinin', 'Youjinbou', 'Shounin']);
            const sl = pick(['Isekai Nonbiri', 'Henkyou de Slow Life', 'Kimama ni', 'Tanoshii']);
            const st = pick(['Isekai de', 'Henkyou de', 'Mori no Naka de', 'Outo no Hazure de']);
            return `${sl} ${pr} wo Hajimemashita: ${st} Nonbiri Seikatsu`;
        }
        case 'Isekai Profissional': {
            const profs = [{ jp: 'Yakkyokushi', pt: 'Farmacêutico' }, { jp: 'Nouka', pt: 'Fazendeiro' }, { jp: 'Youjinbou', pt: 'Guarda-Costas' }, { jp: 'Ryourinin', pt: 'Chef' }, { jp: 'Kajiya', pt: 'Ferreiro' }, { jp: 'Renkinjutsushi', pt: 'Alquimista' }, { jp: 'Shounin', pt: 'Comerciante' }];
            const p = pick(profs);
            return pick([`Isekai ${p.jp}: Cheat Skill de ${p.pt} Seikatsu`, `Tensei shitara ${p.jp} Datta: Isekai de ${p.pt} wo Kiwamemasu`, `${p.jp} no Isekai Seikatsu: Slow Life to Omottara Sekai Saikyou ni?`]);
        }
        case 'Reencarnação Incomum': {
            const forms = [{ jp: 'Ken', pt: 'Espada' }, { jp: 'Slime', pt: 'Slime' }, { jp: 'Dragon no Tamago', pt: 'Ovo de Dragão' }, { jp: 'Gaikotsu Kishi', pt: 'Cavaleiro Esqueleto' }, { jp: 'Jidou Hanbaiki', pt: 'Máquina de Venda' }, { jp: 'Kumoko', pt: 'Aranha' }, { jp: 'Golem', pt: 'Golem' }];
            const f = pick(forms);
            return pick([`Tensei shitara ${f.jp} Deshita: Saikyou ${f.pt} no Isekai Musou`, `${f.jp} ni Umarekawatta Ore wa Sekai Saikyou`, `${f.jp} Tensei: ${f.pt} demo Tsuyoku Naremasu`]);
        }
        case 'OP mas Humilde': {
            const h = pick(['Murabito A', 'Shomin', 'Heibon', 'Yowai', 'Futsuu']);
            const id = pick(['Saikyou no Maou', 'Kami', 'Densetsu no Yuusha', 'Sekai Saikyou', 'Hakaishin']);
            return pick([`${id} datta Ore ga ${h} to shite Isekai de Slow Life`, `Yowai to Omotteta? Jitsu wa Ore ${id} Dattan desu`, `${h} ni Tensei shita ${id} no Nonbiri Musou`]);
        }
        case 'Vilã Nobre': {
            const pre = pick(['Akuyaku Reijou wa', 'Akuyaku Reijou desu ga', 'Akuyaku Reijou nanode', 'Akuyaku Reijou Level 99:']);
            const goal = pick(['Last Boss wo Kattemimashita', 'Death Flag wo Kaihi Shimasu', 'Dekiai Route ni Haitte Shimaimashita', 'Konyaku Haki wo Mezashimasu', 'Slow Life wo Okuru Tsumori Deshita']);
            return `${pre} ${goal}`;
        }
        case 'Título Chinês Curto': {
            const real = ['Quanzhi Fashi', 'Wu Dong Qian Kun', 'Dou Po Cangqiong', "The King's Avatar", "Spare Me, Great Lord", 'Martial Peak', 'Soul Land'];
            const pre2 = ['Legend of', 'Tales of', 'Chronicles of', 'Path of', 'Rise of'];
            const sub = ['Immortals', 'Dragons', 'Warriors', 'Cultivation', 'Supreme', 'Divine'];
            return Math.random() > 0.5 ? pick(real) : `${pick(pre2)} ${pick(sub)}`;
        }
        default: {
            const fallback = [`Tensei shitara Yuusha Datta Ken`, `Isekai de Slow Life wo Mezashimashita`, `Tsuihou sareta ore ga Sekai Saikyou ni Natta`];
            let name = pick(fallback);
            if (kw.length) name += ` to ${transKw(pick(kw))}`;
            return name;
        }
    }
}

function makeSynopsis(data: AnimeData): string {
    const map: Record<string, string[]> = {
        'Expulso → Sucesso': ['Após ser expulso do grupo, o protagonista descobre seu verdadeiro poder.', 'Rejeitado pelos heróis, ele prova que era o mais forte o tempo todo.'],
        'Slow Life': ['Cansado de batalhas, decide viver tranquilamente em outro mundo.', 'Reencarnado, ele abre um negócio e vive em paz.'],
        'Isekai Profissional': ['Com conhecimento moderno revoluciona seu ofício em um mundo de fantasia.', 'Sua profissão "comum" se torna a chave para salvar o reino.'],
        'Reencarnação Incomum': ['Reencarnado em forma inusitada, embarca em jornada única.', 'O que parecia maldição se revela uma benção extraordinária.'],
        'OP mas Humilde': ['Com poder divino mas vivendo como aldeão, ele só quer paz.', 'Ex-rei demônio como humano comum — o destino não o deixa.'],
        'Vilã Nobre': ['Reencarnada como vilã de otome game, ela luta para evitar seu destino.', 'A vilã decide mudar a história a seu favor.'],
        'Título Chinês Curto': ['Em um mundo de cultivo, ele busca a imortalidade.', 'Com talento celestial, ele sobe ao topo da hierarquia.'],
    };
    const pool = map[data.pattern ?? ''] ?? ['Um jovem descobre poderes ocultos e embarca em uma jornada épica.', 'Traído por companheiros, o protagonista busca vingança e poder.'];
    return pick(pool);
}

function calcScore(name: string): number {
    let s = 50;
    if (name.includes('Tensei')) s += 15;
    if (name.includes('Isekai')) s += 15;
    if (name.includes('Tsuihou')) s += 10;
    if (name.includes('Saikyou')) s += 10;
    if (name.includes('Jitsu wa')) s += 8;
    if (name.length > 50) s += 10;
    if (name.includes('Level')) s += 7;
    return Math.min(s, 99);
}

function buildNames(count: number, data: AnimeData, mode: GeneratorMode): AnimeName[] {
    return Array.from({ length: count }, () => {
        const title = makeTitle(data, mode);
        return { title, synopsis: makeSynopsis(data), score: calcScore(title) };
    });
}

/* ─── Component ─── */
export const UmbraOnomancer: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [step, setStep] = useState(0);
    const [animeData, setAnimeData] = useState<AnimeData>({});
    const [isTyping, setIsTyping] = useState(false);
    const [favorites, setFavorites] = useState<string[]>([]);
    const [generatedNames, setGeneratedNames] = useState<AnimeName[]>([]);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [mode, setMode] = useState<GeneratorMode>('normal');
    const [copiedName, setCopiedName] = useState<string | null>(null);
    const chatRef = useRef<HTMLDivElement>(null);
    const dataRef = useRef<AnimeData>({});
    const modeRef = useRef<GeneratorMode>('normal');
    const stepRef = useRef(0);

    useEffect(() => { dataRef.current = animeData; }, [animeData]);
    useEffect(() => { modeRef.current = mode; }, [mode]);
    useEffect(() => { stepRef.current = step; }, [step]);
    useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, isTyping]);

    const addMsg = (msg: ChatMsg) => setMessages(prev => [...prev, msg]);

    const askQ = (idx: number) => {
        if (idx >= QUESTIONS.length) return;
        const q = QUESTIONS[idx];
        setIsTyping(true);
        setTimeout(() => {
            setIsTyping(false);
            addMsg({ type: 'bot', text: q.text, options: q.options ?? null, isTextInput: q.type === 'text', placeholder: q.placeholder });
        }, 800);
    };

    useEffect(() => {
        try { const h = localStorage.getItem('onomancer_history'); if (h) setHistory(JSON.parse(h)); } catch { }
        try { const f = localStorage.getItem('onomancer_favorites'); if (f) setFavorites(JSON.parse(f)); } catch { }
        addMsg({ type: 'bot', text: 'Saudações, Onomancer! 🎌 Vou te fazer algumas perguntas para criar títulos de anime autênticos. Vamos começar?' });
        setTimeout(() => askQ(0), 900);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const saveHistory = (names: AnimeName[], data: AnimeData) => {
        setHistory(prev => {
            const updated = [{ date: new Date().toLocaleString('pt-BR'), names, data }, ...prev].slice(0, 20);
            localStorage.setItem('onomancer_history', JSON.stringify(updated));
            return updated;
        });
    };

    const toggleFav = (name: string) => {
        setFavorites(prev => {
            const updated = prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name];
            localStorage.setItem('onomancer_favorites', JSON.stringify(updated));
            return updated;
        });
    };

    const handleOption = (opt: string) => {
        addMsg({ type: 'user', text: opt });
        const q = QUESTIONS[stepRef.current];
        const next = { ...dataRef.current, [q.id]: opt };
        setAnimeData(next); dataRef.current = next;
        if (stepRef.current === QUESTIONS.length - 1) {
            triggerGenerate(10, next);
        } else {
            const ns = stepRef.current + 1;
            setStep(ns); stepRef.current = ns;
            setTimeout(() => askQ(ns), 500);
        }
    };

    const handleTextInput = (val: string) => {
        addMsg({ type: 'user', text: val || 'Nenhuma palavra-chave' });
        const q = QUESTIONS[stepRef.current];
        const next = { ...dataRef.current, [q.id]: val };
        setAnimeData(next); dataRef.current = next;
        const ns = stepRef.current + 1;
        setStep(ns); stepRef.current = ns;
        if (ns >= QUESTIONS.length) {
            triggerGenerate(10, next);
        } else {
            setTimeout(() => askQ(ns), 500);
        }
    };

    const triggerGenerate = (count: number, data: AnimeData) => {
        setIsTyping(true);
        setTimeout(() => {
            setIsTyping(false);
            const names = buildNames(count, data, modeRef.current);
            setGeneratedNames(names);
            saveHistory(names, data);
            addMsg({ type: 'bot', text: `Aqui estão ${count} títulos${modeRef.current === 'meme' ? ' (MODO MEME 😂)' : ''}: `, animeNames: names });
        }, 1500);
    };

    const restartChat = () => {
        setMessages([]); setStep(0); stepRef.current = 0;
        setAnimeData({}); dataRef.current = {};
        setMode('normal'); modeRef.current = 'normal';
        addMsg({ type: 'bot', text: 'Vamos criar novos títulos! 🎌' });
        setTimeout(() => askQ(0), 900);
    };

    const randomizeAll = () => {
        setMode('random'); modeRef.current = 'random';
        setMessages([]); setStep(0); stepRef.current = 0;
        const rData: AnimeData = { animeType: pick(QUESTIONS[0].options!), pattern: pick(QUESTIONS[1].options!), genre: pick(QUESTIONS[2].options!), tone: pick(QUESTIONS[3].options!), protagonist: pick(QUESTIONS[4].options!), companions: pick(QUESTIONS[5].options!), power: pick(QUESTIONS[6].options!), setting: pick(QUESTIONS[7].options!), goal: pick(QUESTIONS[8].options!), twist: pick(QUESTIONS[9].options!), keywords: '' };
        setAnimeData(rData); dataRef.current = rData;
        addMsg({ type: 'bot', text: `🎲 Randomizado! Padrão: **${rData.pattern}**` });
        setTimeout(() => {
            const names = buildNames(10, rData, 'random');
            setGeneratedNames(names); saveHistory(names, rData);
            addMsg({ type: 'bot', text: 'Aqui estão 10 títulos aleatórios:', animeNames: names });
        }, 1500);
    };

    const activateMeme = () => {
        setMode('meme'); modeRef.current = 'meme';
        setMessages([]); setStep(0); stepRef.current = 0;
        setAnimeData({}); dataRef.current = {};
        addMsg({ type: 'bot', text: '😂 MODO MEME ATIVADO! Prepare-se para títulos ABSURDAMENTE longos!' });
        setTimeout(() => askQ(0), 900);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedName(text);
        setTimeout(() => setCopiedName(null), 2000);
    };

    const exportTxt = () => {
        const lines = ['='.repeat(60), 'UMBRA ONOMANCER — EXPORTAÇÃO', '='.repeat(60), '', 'FAVORITOS:', ...favorites.map((n, i) => `${i + 1}. ${n}`), '', 'ÚLTIMA GERAÇÃO:', ...generatedNames.map((n, i) => `${i + 1}. ${n.title}\n   Score: ${n.score}/99\n   ${n.synopsis}\n`), `Gerado em: ${new Date().toLocaleString('pt-BR')}`].join('\n');
        const blob = new Blob([lines], { type: 'text/plain' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `onomancer-${Date.now()}.txt`; a.click();
    };

    return (
        <div className="ono-wrap">

            {/* Sidebar */}
            <div className="ono-sdb">
                <div className="ono-sdb-title">⚡ Modos Rápidos</div>
                <button className="ono-mode-btn" onClick={randomizeAll}>🎲 Randomizar Tudo</button>
                <button className="ono-mode-btn" onClick={activateMeme}>😂 Modo Meme</button>
                <button className="ono-mode-btn" onClick={restartChat}>🔄 Novo Normal</button>

                <div className="ono-sdb-title" style={{ marginTop: 14 }}>⭐ Favoritos ({favorites.length})</div>
                <div className="ono-favs">
                    {favorites.length === 0
                        ? <div className="ono-fav-empty">Nenhum favorito ainda</div>
                        : favorites.map((f, i) => <div key={i} className="ono-fav-item" onClick={() => copyToClipboard(f)} title={f}>{f.length > 38 ? f.slice(0, 38) + '…' : f}</div>)
                    }
                </div>
                <button className="ono-export-btn" onClick={exportTxt}>💾 Exportar TXT</button>
            </div>

            {/* Main */}
            <div className="ono-main">
                <div className="ono-hdr">
                    <div className="ono-hdr-title">🎌 Umbra Onomancer</div>
                    <div className="ono-hdr-sub">7 Padrões · Expulso · Slow Life · Isekai Pro · Reencarnação · OP Humilde · Vilã · Chinês</div>
                </div>

                <div className="ono-tabs">
                    {(['chat', 'examples', 'history'] as ActiveTab[]).map(t => (
                        <button key={t} className={`ono-tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
                            {t === 'chat' ? '💬 Chat' : t === 'examples' ? '📚 Exemplos Reais' : '📜 Histórico'}
                        </button>
                    ))}
                </div>

                {activeTab === 'chat' && (
                    <div className="ono-chat" ref={chatRef}>
                        {messages.map((msg, i) => (
                            <div key={i} className={`ono-msg ono-msg-${msg.type}`}>
                                {msg.type === 'bot' && <div className="ono-avatar">🤖</div>}
                                <div className="ono-msg-body">
                                    <div className={`ono-bubble ono-bubble-${msg.type}`}>{msg.text}</div>
                                    {msg.options && (
                                        <div className="ono-options">
                                            {msg.options.map((opt, oi) => <button key={oi} className="ono-opt-btn" onClick={() => handleOption(opt)}>{opt}</button>)}
                                        </div>
                                    )}
                                    {msg.isTextInput && (
                                        <div className="ono-text-wrap">
                                            <input className="ono-text-input" type="text" placeholder={msg.placeholder}
                                                onKeyDown={e => { if (e.key === 'Enter') { handleTextInput((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ''; } }} />
                                            <span className="ono-text-hint">↵ Enter para confirmar</span>
                                        </div>
                                    )}
                                    {msg.animeNames && (
                                        <div className="ono-names">
                                            {msg.animeNames.map((item, ni) => (
                                                <div key={ni} className="ono-name-card">
                                                    <div className="ono-name-top">
                                                        <span className="ono-name-title">{ni + 1}. {item.title}</span>
                                                        <span className="ono-badge">⚡ {item.score}/99</span>
                                                        <div className="ono-acts">
                                                            <button className={`ono-act-btn ${favorites.includes(item.title) ? 'active' : ''}`} onClick={() => toggleFav(item.title)}>{favorites.includes(item.title) ? '⭐' : '☆'}</button>
                                                            <button className="ono-act-btn" onClick={() => copyToClipboard(item.title)}>{copiedName === item.title ? '✓' : '📋'}</button>
                                                        </div>
                                                    </div>
                                                    <div className="ono-synopsis">{item.synopsis}</div>
                                                </div>
                                            ))}
                                            <button className="ono-restart-btn" onClick={restartChat}>🔄 Gerar Novos Títulos</button>
                                        </div>
                                    )}
                                </div>
                                {msg.type === 'user' && <div className="ono-avatar ono-av-user">✦</div>}
                            </div>
                        ))}
                        {isTyping && (
                            <div className="ono-msg ono-msg-bot">
                                <div className="ono-avatar">🤖</div>
                                <div className="ono-typing"><span /><span /><span /></div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'examples' && (
                    <div className="ono-chat ono-ex-area">
                        <div className="ono-ex-hdr">
                            <div className="ono-ex-title-hdr">📚 Galeria de Animes Reais</div>
                            <div className="ono-pattern-tags">
                                {['📋 Expulso→Sucesso', '🏡 Slow Life', '💼 Isekai Pro', '🎭 Reencarnação', '😇 OP Humilde', '👑 Vilã Nobre', '🇨🇳 Chinês'].map((t, i) => <span key={i} className="ono-ptag">{t}</span>)}
                            </div>
                        </div>
                        <div className="ono-gallery">
                            {REAL_EXAMPLES.map((ex, i) => (
                                <div key={i} className="ono-ex-card" onClick={() => copyToClipboard(ex.title)}>
                                    <div className="ono-ex-name">{ex.title}</div>
                                    <div className="ono-ex-rating">⭐ {ex.rating}/10</div>
                                    <div className="ono-ex-pat">📋 {ex.pattern}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="ono-chat">
                        <div className="ono-hist-hdr">📜 Histórico de Gerações</div>
                        {history.length === 0
                            ? <div className="ono-no-hist"><div className="ono-no-hist-icon">📭</div><p>Nenhuma geração anterior</p></div>
                            : history.map((item, i) => (
                                <div key={i} className="ono-hist-item" onClick={() => { setActiveTab('chat'); setMessages([{ type: 'bot', text: `📜 Geração de ${item.date}:`, animeNames: item.names }]); }}>
                                    <div className="ono-hist-date">📅 {item.date}</div>
                                    <div className="ono-hist-info">{item.names.length} títulos · padrão: {item.data.pattern ?? '—'}</div>
                                </div>
                            ))
                        }
                    </div>
                )}
            </div>
        </div>
    );
};
