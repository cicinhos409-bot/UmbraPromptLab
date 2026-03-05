export interface GalleryPrompt {
    title: string;
    cat: string;
    prompt: string;
}

export const GENRES = [
    "Ação", "Artes Marciais", "Aventura", "Comédia", "Demônios", "Drama", "Ecchi",
    "Escolar", "Esporte", "Fantasia", "Ficção Científica", "Harém", "Histórico", "Horror",
    "Jogo", "Light Novel", "Magia", "Mecha", "Militar", "Mistério", "Musical", "Romance",
    "Samurai", "Seinen", "Shoujo", "Shounen", "Slice Of Life", "Sobrenatural",
    "Super Poderes", "Suspense", "Terror", "Cyberpunk", "Isekai"
];

const COLORS = ["Gold", "Cyan", "Magenta", "Neon Green", "Ruby Red", "Electric Blue", "Amethyst", "Silver"];
const ACCENTS = ["Chrome", "Glass", "Carbon Fiber", "Ether", "Plasma", "Aura"];
const CHARACTERS = ["Cyberpunk Mercenary", "Celestial Warrior", "Kawaii Chibi Hero", "Forest Elf", "Mecha Pilot", "Samurai Ronin"];

const generatePromptLines = (genre: string, index: number): string => {
    const styleIdx = index % 3;
    const color = COLORS[index % COLORS.length];
    const accent1 = ACCENTS[index % ACCENTS.length];
    const accent2 = ACCENTS[(index + 1) % ACCENTS.length];
    const char = CHARACTERS[index % CHARACTERS.length];

    if (styleIdx === 0) {
        // Style 1: Cyberpunk / Krenz Kushart
        return [
            `Krenz Kushart and Kyoto Animation aesthetic, ${genre} specialized composition.`,
            `Protagonist wearing intricate cyberpunk streetwear with ${accent1} details.`,
            `Gloss and glitter textures on fabrics, neon lighting reflecting off surfaces.`,
            `${color} accents highlighting the metallic and synthetic elements.`,
            `Cinematic dramatic atmosphere, sharp focus, 4k ultra-detailed complexity.`,
            `✦ UMBRA ENGINE v3 - High-Fidelity Cyber Shadow`
        ].join('\n');
    } else if (styleIdx === 1) {
        // Style 2: Celestialpunk / Artgerm
        return [
            `In the style of Artgerm and Yanjun Cheng, Celestialpunk ${genre} theme.`,
            `Pretty anime female warrior with elf ears and flowing ${color} hair.`,
            `Clad in ${accent1} dress and ${accent2} cloak, Shoujo anime art style.`,
            `${color} and ${accent1} tones, portraiture iconography, 2d game art.`,
            `Celestial atmosphere, divine lighting, undefined anatomy mastery.`,
            `✦ UMBRA ENGINE v3 - Celestial Bloom Core`
        ].join('\n');
    } else {
        // Style 3: Kawaii Chibi
        return [
            `${char} illustrated as a kawaii chibi sticker, ${genre} genre spin.`,
            `Vibrant ${color} and ${accent1} color palette, bold vector lines.`,
            `Minimalist ${accent2} background style, sticker border aesthetic.`,
            `Highly expressive face, oversized eyes, vivid saturation.`,
            `Fine paper texture details, matte finish, soft studio lighting.`,
            `✦ UMBRA ENGINE v3 - Chibi Sticker Forge`
        ].join('\n');
    }
};

export const ALL_PROMPTS: GalleryPrompt[] = GENRES.flatMap(genre => {
    const prompts: GalleryPrompt[] = [];
    for (let i = 0; i < 20; i++) {
        prompts.push({
            title: `${genre} Special Edition #${i + 1}`,
            cat: genre,
            prompt: generatePromptLines(genre, i)
        });
    }
    return prompts;
});
