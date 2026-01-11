import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTelegramAuth } from '../auth/TelegramAuth';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';

const QuestsTab = ({ tasks, fetchEconomyData, balance, addCoins }) => {
    const { user, profile } = useTelegramAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [reward, setReward] = useState(50);
    const [loading, setLoading] = useState(false);

    const handleCreateQuest = async () => {
        if (!title.trim() || !profile?.id) return;
        setLoading(true);

        const { error } = await supabase.from('tasks').insert({
            title,
            description: desc,
            price: reward,
            created_by: profile.id,
            status: 'active'
        });

        if (error) alert("Ошибка: " + error.message);
        else {
            setIsModalOpen(false);
            setTitle('');
            setDesc('');
            setReward(50);
            fetchEconomyData(user.id);
            // Telegram Notification
            import('../../services/telegramNotificationService').then(({ TelegramService }) => {
                TelegramService.notifyNewTask(profile.partner_id, profile.first_name, title, reward);
            });
        }
        setLoading(false);
    };

    const handleCompleteTask = async (task) => {
        addCoins(user, task.price, `Выполнено: ${task.title}`, task.id);
        // Optimistically remove or update UI done in store, but we might want to archive it in DB
        // For now, let's assume 'addCoins' handles the transaction logic. 
        // We should also mark task as completed in DB if it's a one-time thing?
        // User request didn't specify one-time vs recurring. Assuming one-time for created quests.

        await supabase.from('tasks').update({ status: 'completed' }).eq('id', task.id);
        fetchEconomyData(user.id);
    };

    return (
        <section className="animate-fade-in relative">
            <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-xl font-bold dark:text-white text-slate-800">Квесты</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-colors"
                >
                    + Создать
                </button>
            </div>

            {/* List */}
            <div className="flex flex-col gap-3 pb-20">
                {tasks.length === 0 && (
                    <div className="text-center py-10 text-white/30">
                        <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
                        <p>Нет активных квестов</p>
                    </div>
                )}
                {tasks.map(task => (
                    <div key={task.id} className="glass-panel rounded-xl p-4 flex items-center gap-4 active:scale-[0.98] transition-all">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                            <span className="material-symbols-outlined">{task.icon || 'task_alt'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-base dark:text-white truncate">{task.title}</h3>
                            <p className="text-xs dark:text-white/50 line-clamp-2">{task.description}</p>
                            {task.created_by === profile?.id && (
                                <span className="text-[10px] text-white/20 uppercase font-bold">Вы создали</span>
                            )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-xs font-bold text-gold">+{task.price} 🪙</span>
                            <button
                                onClick={() => handleCompleteTask(task)}
                                className="w-8 h-8 rounded-full bg-surface-dark border border-white/10 flex items-center justify-center text-white/30 hover:bg-primary hover:text-white hover:border-primary transition-all"
                            >
                                <span className="material-symbols-outlined text-[20px]">check</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4"
                    >
                        <motion.div
                            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                            className="w-full sm:max-w-sm bg-[#1A1A1A] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Новый Квест</h3>
                                <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-white/40 font-bold uppercase ml-1">Название</label>
                                    <input
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="Например: Сделать массаж"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-primary/50 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-white/40 font-bold uppercase ml-1">Описание</label>
                                    <textarea
                                        value={desc}
                                        onChange={e => setDesc(e.target.value)}
                                        placeholder="Детали выполнения..."
                                        rows={3}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary/50 transition-all resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-white/40 font-bold uppercase ml-1">Награда (ЛавКоины)</label>
                                    <div className="flex items-center gap-4 mt-1">
                                        <input
                                            type="range" min="10" max="500" step="10"
                                            value={reward}
                                            onChange={e => setReward(Number(e.target.value))}
                                            className="flex-1 accent-primary h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <div className="w-16 h-10 rounded-xl bg-white/5 flex items-center justify-center font-bold text-gold border border-white/10">
                                            {reward}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleCreateQuest}
                                    disabled={loading}
                                    className="w-full bg-primary text-white font-bold py-4 rounded-xl mt-4 shadow-lg shadow-primary/20 active:scale-95 transition-all"
                                >
                                    {loading ? "Создание..." : "Создать Квест"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};

export default QuestsTab;
