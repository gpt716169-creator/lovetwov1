import { create } from 'zustand';

export const useThemeStore = create((set) => ({
    theme: 'red', // 'red' | 'green'
    setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
    },
    toggleTheme: () => set((state) => {
        const themes = ['red', 'green', 'blue'];
        const currentIndex = themes.indexOf(state.theme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        document.documentElement.setAttribute('data-theme', nextTheme);
        return { theme: nextTheme };
    }),
}));
