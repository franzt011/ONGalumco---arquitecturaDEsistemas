/**
 * Paleta de Colores — ONG Alumco
 * 
 * Archivo centralizado de colores de marca.
 * Se importa desde tailwind.config.js (igual que en la versión Laravel).
 * 
 * Uso en templates:
 *   bg-alumco-blue, text-alumco-coral, border-alumco-gold, etc.
 *   bg-alumco-blue-light, text-alumco-blue-dark, etc.
 */

export const colores = {
    alumco: {
        // Azul principal (logo texto, triángulo azul, headings)
        blue: {
            lightest: '#E8EDFB',  // fondo lavanda suave
            light: '#7B9AD6',     // hover suave
            DEFAULT: '#2D4A8A',   // azul principal de marca
            dark: '#1E3A6E',      // variante oscura para fondos
            darkest: '#142952',   // footer / fondos muy oscuros
        },

        // Coral / Rojo (triángulos rosa, CTAs, acentos)
        coral: {
            light: '#FDDEDE',     // fondo sutil
            DEFAULT: '#F25C5C',   // botones y acentos principales
            dark: '#D94444',      // hover
        },

        // Amarillo / Dorado (triángulo amarillo, highlights)
        gold: {
            light: '#FFF3D6',     // fondo sutil
            DEFAULT: '#F0A500',   // acento dorado
            dark: '#CC8C00',      // hover
        },

        // Verde (triángulo verde, éxito, badges)
        green: {
            light: '#E8F5D6',     // fondo sutil
            DEFAULT: '#A8D86E',   // verde de marca
            dark: '#7FB845',      // hover / activo
        },

        // Neutros (complementarios)
        gray: {
            50: '#F8FAFC',
            100: '#F1F5F9',
            200: '#E2E8F0',
            300: '#CBD5E1',
            400: '#94A3B8',
            500: '#64748B',
            600: '#475569',
            700: '#334155',
            800: '#1E293B',
            900: '#0F172A',
        },
    },
};
