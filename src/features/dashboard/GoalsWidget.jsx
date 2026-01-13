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
    const [selectedGoal, setSelectedGoal] = useState(null); // For details view

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
            .or(`created_by.eq.${profile.id},pending_approval_from.eq.${profile.id}${profile.partner_id ? `,created_by.eq.${profile.partner_id}` : ''}`)
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
            resetForm();
            setIsModalOpen(false);
            fetchGoals();
        }
        setLoading(false);
    };

    const approveGoal = async (goalId, e) => {
        e?.stopPropagation();
        const { error } = await supabase
            .from('goals')
            .update({ status: 'active', pending_approval_from: null })
            .eq('id', goalId);

        if (!error) fetchGoals();
    };

    const resetForm = () => {
        setTitle('');
        setDesc('');
        setDeadline('');
        setSelectedGoal(null);
    };

    const handleGoalClick = (goal) => {
        setSelectedGoal(goal);
        setIsModalOpen(true);
    };

    const openCreateModal = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const pendingGoals = goals.filter(g => g.status === 'pending');
    const activeGoals = goals.filter(g => g.status === 'active');

    return (
        <div className="glass-panel rounded-3xl p-5 h-full relative overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg">flag</span>
                    </div>
                    <span className="text-white font-bold text-sm">Наши Цели</span>
                </div>
                <button
                    onClick={openCreateModal}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                    <span className="material-symbols-outlined text-white/60">add</span>
                </button>
            </div>

            {/* GOALS LIST */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 relative z-10 max-h-[200px] hide-scrollbar">
                {goals.length === 0 ? (
                    <div className="text-center text-white/30 text-xs py-8">
                        Нет целей.<br />Создайте общую мечту!
                    </div>
                ) : (
                    goals.map(goal => {
                        const isPending = goal.status === 'pending';
                        const isWaitingForMe = isPending && goal.pending_approval_from === profile?.id;

                        return (
                            <div
                                key={goal.id}
                                onClick={() => handleGoalClick(goal)}
                                className={clsx(
                                    "p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer bg-white/5 hover:bg-white/10",
                                    isPending ? "border-dashed border-indigo-500/30" : "border-transparent"
                                )}
                            >
                                <div className="flex flex-col gap-0.5 min-w-0">
                                    <span className={clsx("font-bold text-sm truncate", isPending ? "text-white/70" : "text-white")}>
                                        {goal.title}
                                    </span>
                                    {goal.deadline && (
                                        <span className="text-[10px] text-indigo-300 font-mono">
                                            {format(new Date(goal.deadline), 'd MMM', { locale: ru })}
                                        </span>
                                    )}
                                </div>

                                {isWaitingForMe ? (
                                    <button
                                        onClick={(e) => approveGoal(goal.id, e)}
                                        className="px-2 py-1 bg-green-500/20 text-green-400 text-[10px] font-bold rounded-lg border border-green-500/50 hover:bg-green-500/30"
                                    >
                                        Принять
                                    </button>
                                ) : isPending ? (
                                    <span className="text-[10px] text-white/30 italic">Ждем...</span>
                                ) : (
                                    <span className="material-symbols-outlined text-white/20 text-lg">chevron_right</span>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Background Decor */}
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none"></div>

            {/* DETAILS / CREATE MODAL */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsModalOpen(false)}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full max-w-sm bg-[#1A1A1A] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
                        >
                            {/* Decor */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>

                            <div className="flex justify-between items-center mb-6 relative z-10">
                                <h3 className="text-xl font-black text-white uppercase italic tracking-wider">
                                    {selectedGoal ? 'Детали Цели' : 'Новая Цель'}
                                </h3>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            {selectedGoal ? (
                                // --- VIEW MODE ---
                                <div className="flex flex-col gap-4 relative z-10">
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                        <h2 className="text-2xl font-bold text-white leading-tight mb-2">{selectedGoal.title}</h2>
                                        <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                                            {selectedGoal.description || "Нет описания"}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 text-indigo-300 font-mono text-xs bg-indigo-500/10 p-3 rounded-xl w-fit">
                                        <span className="material-symbols-outlined text-sm">event</span>
                                        {selectedGoal.deadline
                                            ? format(new Date(selectedGoal.deadline), 'd MMMM yyyy', { locale: ru })
                                            : "Без дедлайна"
                                        }
                                    </div>

                                    {selectedGoal.status === 'pending' && selectedGoal.pending_approval_from === profile?.id && (
                                        <button
                                            onClick={(e) => { approveGoal(selectedGoal.id, e); setIsModalOpen(false); }}
                                            className="mt-2 w-full py-3 bg-green-600 rounded-xl text-white font-bold shadow-lg shadow-green-600/20"
                                        >
                                            Подтвердить участие
                                        </button>
                                    )}
                                </div>
                            ) : (
                                // --- CREATE MODE ---
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
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GoalsWidget;
