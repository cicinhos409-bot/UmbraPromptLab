import React, { useState, useMemo } from 'react';
import { ALL_PROMPTS, GENRES, GalleryPrompt } from './galleryData';
import './UmbraGallery.css';

export const UmbraGallery: React.FC = () => {
    const [filter, setFilter] = useState("Todos");
    const [search, setSearch] = useState("");
    const [selectedPrompt, setSelectedPrompt] = useState<GalleryPrompt | null>(null);
    const [showToast, setShowToast] = useState(false);

    const genresWithAll = useMemo(() => ["Todos", ...GENRES], []);

    const filteredPrompts = useMemo(() => {
        return ALL_PROMPTS.filter(p => {
            const matchCat = filter === "Todos" || p.cat === filter;
            const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
                p.cat.toLowerCase().includes(search.toLowerCase()) ||
                p.prompt.toLowerCase().includes(search.toLowerCase());
            return matchCat && matchSearch;
        });
    }, [filter, search]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
            if (selectedPrompt) setSelectedPrompt(null);
        });
    };

    return (
        <div className="umbra-gallery-container animate-in">
            <header className="gallery-header">
                <div className="search-wrapper">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Busque por gênero, personagem ou cenário..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="gallery-search-input"
                    />
                </div>
            </header>

            <nav className="gallery-nav">
                {genresWithAll.map(g => (
                    <button
                        key={g}
                        className={`gallery-cat-btn ${filter === g ? 'active' : ''}`}
                        onClick={() => setFilter(g)}
                    >
                        {g}
                    </button>
                ))}
            </nav>

            <div className="gallery-grid">
                {filteredPrompts.length > 0 ? (
                    filteredPrompts.map((p, idx) => (
                        <div key={idx} className="gallery-card" onClick={() => setSelectedPrompt(p)}>
                            <div className="card-tag">{p.cat}</div>
                            <h3 className="card-title">{p.title}</h3>
                            <p className="card-description" style={{ whiteSpace: 'pre-line' }}>{p.prompt}</p>
                            <div className="card-footer">
                                <span className="engine-label">✦ UMBRA ENGINE v3</span>
                                <button
                                    className="gallery-copy-btn"
                                    onClick={(e) => { e.stopPropagation(); handleCopy(p.prompt); }}
                                >
                                    COPIAR
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="gallery-empty">
                        Nenhum prompt encontrado para esta busca.
                    </div>
                )}
            </div>

            {selectedPrompt && (
                <div className="gallery-modal-overlay" onClick={() => setSelectedPrompt(null)}>
                    <div className="gallery-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={() => setSelectedPrompt(null)}>✕</button>
                        <div className="modal-content">
                            <div className="modal-tag">{selectedPrompt.cat}</div>
                            <h2 className="modal-title">{selectedPrompt.title}</h2>
                            <div className="modal-prompt-view" style={{ whiteSpace: 'pre-line' }}>
                                {selectedPrompt.prompt}
                            </div>
                            <button
                                className="modal-action-btn"
                                onClick={() => handleCopy(selectedPrompt.prompt)}
                            >
                                COPIAR AGORA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className={`gallery-toast ${showToast ? 'show' : ''}`}>
                ✦ PROMPT COPIADO COM SUCESSO!
            </div>
        </div>
    );
};
