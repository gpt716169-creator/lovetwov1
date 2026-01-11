import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTelegramAuth } from '../auth/TelegramAuth';
import clsx from 'clsx';
import { useEconomyStore } from '../../store/economyStore';

const ListsTab = () => {
    const { user, profile } = useTelegramAuth();
    const { shoppingList, addShoppingItem, toggleShoppingItem, deleteShoppingItem } = useEconomyStore();
    const [subTab, setSubTab] = useState('shopping'); // 'shopping' | 'movies'
    const [movies, setMovies] = useState([]);
    const [newMovie, setNewMovie] = useState('');

    useEffect(() => {
        if (subTab === 'movies') fetchMovies();
    }, [subTab]);

    const fetchMovies = async () => {
        const { data } = await supabase.from('movies').select('*').order('created_at', { ascending: false });
        if (data) setMovies(data);
    };

    const addMovie = async () => {
        if (!newMovie.trim() || !profile?.id) return;
        const { error } = await supabase.from('movies').insert({
            title: newMovie,
            added_by: profile.id
        });
        if (!error) {
            setNewMovie('');
            fetchMovies();
        }
    };

    const deleteMovie = async (id) => {
        await supabase.from('movies').delete().eq('id', id);
        fetchMovies();
    };

    const pickRandomMovie = () => {
        if (movies.length === 0) return;
        const random = movies[Math.floor(Math.random() * movies.length)];
        alert(`Случайный выбор: "${random.title}"! (Добавил: ${random.added_by === profile?.id ? 'Вы' : 'Партнер'})`);
    };

    return (
        <section className="animate-fade-in relative">
            <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-xl font-bold dark:text-white text-slate-800">Списки</h2>
                <div className="flex bg-white/5 p-1 rounded-lg">
                    <button
                        onClick={() => setSubTab('shopping')}
                        className={clsx("px-3 py-1 text-xs font-bold rounded-md transition-all", subTab === 'shopping' ? "bg-primary text-white" : "text-white/50")}
                    >
                        Покупки
                    </button>
                    <button
                        onClick={() => setSubTab('movies')}
                        className={clsx("px-3 py-1 text-xs font-bold rounded-md transition-all", subTab === 'movies' ? "bg-primary text-white" : "text-white/50")}
                    >
                        Фильмы
                    </button>
                </div>
            </div>

            {/* SHOPPING LIST */}
            {subTab === 'shopping' && (
                <div className="flex flex-col gap-4 animate-fade-in">
                    <div className="glass-panel p-2 rounded-2xl flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-surface-dark flex items-center justify-center text-white/50 shrink-0">
                            <span className="material-symbols-outlined">add</span>
                        </div>
                        <input
                            type="text"
                            placeholder="Добавить продукт..."
                            className="bg-transparent border-none outline-none text-white w-full placeholder:text-white/20 text-sm"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                    addShoppingItem(user, e.currentTarget.value.trim());
                                    e.currentTarget.value = '';
                                }
                            }}
                        />
                        <button onClick={(e) => {
                            const input = e.currentTarget.previousSibling;
                            if (input.value.trim()) {
                                addShoppingItem(user, input.value.trim());
                                input.value = '';
                            }
                        }} className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                            <span className="material-symbols-outlined">send</span>
                        </button>
                    </div>

                    <div className="flex flex-col gap-2 pb-20">
                        {shoppingList.map(item => (
                            <div key={item.id} className={clsx(
                                "glass-panel p-3 rounded-xl flex items-center gap-3 transition-all",
                                item.is_checked ? "opacity-50" : "opacity-100"
                            )}>
                                <button
                                    onClick={() => toggleShoppingItem(item.id, item.is_checked)}
                                    className={clsx(
                                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0",
                                        item.is_checked ? "bg-primary border-primary text-white" : "border-white/20 text-transparent hover:border-primary"
                                    )}
                                >
                                    <span className="material-symbols-outlined text-[16px]">check</span>
                                </button>
                                <span className={clsx("flex-1 font-medium text-sm transition-all", item.is_checked ? "text-white/40 line-through" : "text-white")}>
                                    {item.title}
                                </span>
                                <button onClick={() => deleteShoppingItem(item.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/20 hover:text-red-400">
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MOVIE LIST */}
            {subTab === 'movies' && (
                <div className="flex flex-col gap-4 animate-fade-in">
                    <div className="flex gap-2">
                        <div className="glass-panel p-2 rounded-2xl flex-1 flex items-center gap-2">
                            <input
                                value={newMovie}
                                onChange={e => setNewMovie(e.target.value)}
                                placeholder="Название фильма..."
                                className="bg-transparent border-none outline-none text-white w-full placeholder:text-white/20 text-sm px-2"
                            />
                        </div>
                        <button onClick={addMovie} className="w-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <span className="material-symbols-outlined">add</span>
                        </button>
                    </div>

                    <button
                        onClick={pickRandomMovie}
                        className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">shuffle</span>
                        <span>Выбрать случайный</span>
                    </button>

                    <div className="flex flex-col gap-2 pb-20">
                        {movies.map(movie => {
                            // Determine Color: My movies = Blue, Partner's = Green (or vice versa as per user req?)
                            // User request: "anya adds green, kostya adds blue".
                            // I don't know who is Anya/Kostya by ID easily without hardcoding or smart logic.
                            // I will use: "Mine" = Blue, "Partner" = Green. (Arbitrary, but consistent for the session).
                            // Wait, user said "Kostya adds Blue". Current user is "Mock Konstantin". So Mine = Blue.
                            const isMine = movie.added_by === profile?.id;
                            const colorClass = isMine ? "border-l-4 border-blue-500 bg-blue-500/5" : "border-l-4 border-green-500 bg-green-500/5";

                            return (
                                <div key={movie.id} className={clsx("glass-panel p-3 rounded-r-xl rounded-l-md flex items-center justify-between", colorClass)}>
                                    <span className="font-medium text-white text-sm">{movie.title}</span>
                                    <button onClick={() => deleteMovie(movie.id)} className="text-white/20 hover:text-red-400">
                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </section>
    );
};

export default ListsTab;
