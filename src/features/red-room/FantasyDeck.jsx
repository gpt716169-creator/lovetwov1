import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useTelegramAuth } from '../auth/TelegramAuth';

const FantasyDeck = () => {
    const { profile } = useTelegramAuth();
    const [fantasies, setFantasies] = useState([]);
    const [activeCard, setActiveCard] = useState(0);
    const [isAddMode, setIsAddMode] = useState(false);

    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');

    useEffect(() => {
        if (profile?.id) fetchFantasies();
    }, [profile]);

    const fetchFantasies = async () => {
        const { data } = await supabase
            .from('fantasies')
            .select('*')
            .order('created_at', { ascending: false });

        if (data && data.length > 0) {
            setFantasies(data);
        } else {
            setFantasies([]);
        }
    };

    const addFantasy = async () => {
        if (!newTitle) return;
        await supabase.from('fantasies').insert({
            user_id: profile.id,
            title: newTitle,
            description: newDesc,
            is_shared: true
        });
        setNewTitle('');
        setNewDesc('');
        setIsAddMode(false);
        fetchFantasies();

        // Telegram Notification
        import('../../services/telegramNotificationService').then(({ TelegramService }) => {
            TelegramService.notifyNewFantasy(profile.partner_id, profile.first_name, newTitle);
        });
    };

    const deleteFantasy = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('Удалить эту фантазию?')) return;

        await supabase.from('fantasies').delete().eq('id', id);

        // Optimistic Remove
        setFantasies(prev => prev.filter(f => f.id !== id));
        if (activeCard >= fantasies.length - 1) setActiveCard(Math.max(0, fantasies.length - 2));
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full flex flex-col justify-center items-center relative w-full"
        >
            <div className="relative w-full max-w-sm aspect-[3/4]">
                <AnimatePresence>
                    {fantasies.length > 0 && activeCard < fantasies.length ? (
                        <motion.div
                            key={fantasies[activeCard].id}
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ x: 200, opacity: 0, rotate: 20 }}
                            className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-3xl border border-white/10 shadow-2xl p-8 flex flex-col justify-between z-20"
                        >
                            {/* Card Content */}
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold uppercase tracking-wider">
                                        Карта {activeCard + 1}/{fantasies.length}
                                    </span>
                                    {fantasies[activeCard].user_id === profile?.id && (
                                        <button
                                            onClick={(e) => deleteFantasy(e, fantasies[activeCard].id)}
                                            className="text-white/20 hover:text-red-500 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm">delete</span>
                                        </button>
                                    )}
                                </div>
                                <h3 className="text-3xl font-bold leading-tight mb-4 text-white">
                                    {fantasies[activeCard].title}
                                </h3>
                                <p className="text-white/70 leading-relaxed text-lg font-light">
                                    {fantasies[activeCard].description}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-center gap-6 mt-8">
                                <button
                                    onClick={() => setActiveCard(p => p + 1)}
                                    className="w-16 h-16 rounded-full bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-red-400 text-3xl transition-colors border border-white/5"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                                <button
                                    onClick={() => setActiveCard(p => p + 1)}
                                    className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/40 flex items-center justify-center text-white text-3xl transition-colors scale-110"
                                >
                                    <span className="material-symbols-outlined">favorite</span>
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-white/5 rounded-3xl border border-white/5">
                            <span className="material-symbols-outlined text-7xl text-white/20 mb-6">style</span>
                            <h3 className="text-2xl font-bold text-white mb-2">Фантазии кончились</h3>
                            <p className="text-white/40 mb-8">Добавьте свои идеи!</p>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setActiveCard(0)}
                                    className="px-6 py-2 text-white font-bold text-sm border border-white/30 rounded-full hover:bg-white/10"
                                >
                                    Заново
                                </button>
                                <button
                                    onClick={() => setIsAddMode(true)}
                                    className="px-6 py-2 bg-red-600 text-white font-bold text-sm rounded-full shadow-lg hover:bg-red-500"
                                >
                                    + Добавить
                                </button>
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Floating Add Button */}
            {!isAddMode && fantasies.length > 0 && (
                <button
                    onClick={() => setIsAddMode(true)}
                    className="absolute bottom-0 right-0 w-14 h-14 bg-red-600 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform m-4 z-30"
                >
                    <span className="material-symbols-outlined text-white text-2xl">add</span>
                </button>
            )}

            {/* Add Modal */}
            <AnimatePresence>
                {isAddMode && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-zinc-900 border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl"
                        >
                            <h3 className="text-xl font-bold text-white mb-4">Новая фантазия</h3>

                            <input
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                placeholder="Название (кратко)"
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white font-bold mb-3 focus:border-red-500 outline-none"
                            />

                            <textarea
                                value={newDesc}
                                onChange={e => setNewDesc(e.target.value)}
                                placeholder="Опишите детали..."
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white h-32 mb-4 focus:border-red-500 outline-none resize-none"
                            />

                            <div className="flex gap-3">
                                <button onClick={() => setIsAddMode(false)} className="flex-1 py-3 bg-white/5 rounded-xl text-white font-bold">Отмена</button>
                                <button onClick={addFantasy} className="flex-1 py-3 bg-red-600 rounded-xl text-white font-bold shadow-lg shadow-red-600/20">Создать</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default FantasyDeck;
