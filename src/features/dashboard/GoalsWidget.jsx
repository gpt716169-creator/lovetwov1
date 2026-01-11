import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTelegramAuth } from '../auth/TelegramAuth';
import clsx from 'clsx';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';

const GoalsWidget = () => {
    const { profile } = useTelegramAuth();
    const [goals, setGoals] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [deadline, setDeadline] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (profile?.id) fetchGoals();
    }, [profile]);

    const fetchGoals = async () => {
        const { data } = await supabase
            .from('goals')
            .select('*')
            .order('created_at', { ascending: false });
        if (data) setGoals(data);
    };

    const createGoal = async () => {
        if (!title.trim()) return;
        setLoading(true);

        const { error } = await supabase.from('goals').insert({
            title: title,
            description: desc,
            deadline: deadline || null,
            created_by: profile.id,
            status: 'pending',
            pending_approval_from: profile.partner_id
        });

        if (error) alert("Ошибка: " + error.message);
        else {
            setTitle('');
            setDesc('');
            setDeadline('');
            setIsModalOpen(false);
            fetchGoals();
        }
        setLoading(false);
    };

    const approveGoal = async (goalId) => {
        const { error } = await supabase
            .from('goals')
            .update({ status: 'active', pending_approval_from: null })
            .eq('id', goalId);

        if (!error) fetchGoals();
    };

    const activeGoal = goals.find(g => g.status === 'active');
    const pendingGoals = goals.filter(g => g.status === 'pending');

    return (
        <>
            <div className="glass-panel rounded-3xl p-5 flex flex-col justify-between h-full min-h-[180px] relative overflow-hidden">
                <div className="flex justify-between items-start mb-2 relative z-10">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                        <span className="material-symbols-outlined text-xl">flag</span>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="text-xs font-bold text-white/60 bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20 transition-colors"
                    >
                        + Цель
                    </button>
                </div>

                {activeGoal ? (
                    <div className="relative z-10">
                        <p className="text-white/60 text-xs font-medium mb-1">Главная Цель</p>
                        <p className="text-white font-bold text-lg leading-tight line-clamp-1">{activeGoal.title}</p>
                        {activeGoal.description && (
                            <p className="text-white/40 text-[10px] mt-1 line-clamp-1">{activeGoal.description}</p>
                        )}
                        {activeGoal.deadline && (
                            <p className="text-indigo-300 text-xs mt-2 font-mono">
                                • {format(new Date(activeGoal.deadline), 'd MMM yyyy', { locale: ru })}
                            </p>
                        )}
                        <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div className="bg-indigo-500 h-full w-[10%] rounded-full shadow-[0_0_10px_theme('colors.indigo.500')]"></div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-white/30 text-xs py-4 relative z-10">
                        Нет активной цели.<br />Создайте общую мечту!
                    </div>
                )}

                {/* Pending Badge */}
                {pendingGoals.length > 0 && !activeGoal && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                        <div className="flex items-center justify-between text-xs bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20">
                            <span className="text-indigo-200">Ожидание ({pendingGoals.length})</span>
                            {pendingGoals[0].pending_approval_from === profile?.id && (
                                <button onClick={() => approveGoal(pendingGoals[0].id)} className="font-bold text-green-400">Принять</button>
                            )}
                        </div>
                    </div>
                )}

                {/* Background Decor */}
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none"></div>
            </div>

            {/* FULL SCREEN MODAL */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="w-full max-w-sm bg-[#1A1A1A] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
                        >
                            {/* Decor */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>

                            <div className="flex justify-between items-center mb-6 relative z-10">
                                <h3 className="text-2xl font-black text-white uppercase italic tracking-wider">Новая Цель</h3>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="flex flex-col gap-5 relative z-10">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-white/40 uppercase ml-1">Название мечты</label>
                                    <input
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="Например: Поездка на Бали"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-white/40 uppercase ml-1">Описание (детали)</label>
                                    <textarea
                                        value={desc}
                                        onChange={e => setDesc(e.target.value)}
                                        placeholder="Что нужно сделать, какой бюджет, детали..."
                                        rows={4}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all resize-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-white/40 uppercase ml-1">Дедлайн</label>
                                    <input
                                        type="date"
                                        value={deadline}
                                        onChange={e => setDeadline(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50"
                                    />
                                </div>

                                <button
                                    onClick={createGoal}
                                    disabled={loading}
                                    className="mt-4 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    ) : (
                                        <>
                                            <span>Создать</span>
                                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default GoalsWidget;
