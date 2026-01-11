/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // We will use CSS variables for primary colors to support theming
                primary: "var(--color-primary)",
                "primary-dark": "var(--color-primary-dark)",
                "background-light": "var(--color-background-light)",
                "background-dark": "var(--color-background-dark)",
                "surface-dark": "var(--color-surface-dark)",
                gold: "#FFD700",
                mint: "#D1FAE5",
                sage: "#84A98C",
            },
            fontFamily: {
                "display": ["Manrope", "sans-serif"]
            },
            borderRadius: {
                "DEFAULT": "1rem",
                "lg": "1.5rem",
                "xl": "2rem",
                "2xl": "2.5rem",
                "3xl": "3rem",
                "full": "9999px"
            },
            boxShadow: {
                'glow': '0 0 20px var(--color-glow)',
                'neon': '0 0 20px rgba(255, 77, 112, 0.5)',
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            },
            animation: {
                'spin-slow': 'spin 3s linear infinite',
            }
        },
    },
    plugins: [],
}
