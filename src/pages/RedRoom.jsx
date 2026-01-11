import React, { useState } from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import SexDice from '../features/red-room/SexDice';
import FantasyDeck from '../features/red-room/FantasyDeck';
import Kamasutra from '../features/red-room/Kamasutra';

const RedRoom = () => {
    const { profile } = useTelegramAuth();
    const [synced, setSynced] = useState(false);
    const [activeTab, setActiveTab] = useState('cards'); // 'cards' | 'dice' | 'kamasutra'
    const [secureMode, setSecureMode] = useState(false); // If true, blurs EVERYTHING

    const handleSync = () => {
        // Mock sync logic
        setTimeout(() => setSynced(true), 1500);
    };

    return (
        <div className="flex flex-col h-full bg-red-950 min-h-screen text-white pb-24 relative overflow-hidden select-none">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-red-600/20 blur-[100px] rounded-full pointer-events-none"></div>

            {/* Secure Filter */}
            {secureMode && (
                <div
                    onClick={() => setSecureMode(false)}
                    className="absolute inset-0 z-50 backdrop-blur-3xl bg-black/60 flex items-center justify-center cursor-pointer"
                >
                    <div className="flex flex-col items-center">
                        <span className="material-symbols-outlined text-6xl text-white/50 mb-2">visibility_off</span>
                        <p className="text-white/50 font-bold uppercase tracking-widest">Скрыто</p>
                        <p className="text-white/30 text-xs mt-2">Нажмите, чтобы открыть</p>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="flex items-center justify-between px-6 py-6 z-10 shrink-0">
                <h2 className="text-2xl font-black tracking-tighter text-red-100 uppercase italic">Red Room</h2>
                <div className="flex items-center gap-3">
                    {/* Privacy Toggle */}
                    <button
                        onClick={() => setSecureMode(!secureMode)}
                        className={clsx("w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                            secureMode ? "bg-white text-red-900" : "bg-red-500/10 text-red-400"
                        )}
                    >
                        <span className="material-symbols-outlined">{secureMode ? 'visibility_off' : 'visibility'}</span>
                    </button>

                    {/* Sync Badge */}
                    <div className={clsx(
                        "flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-widest transition-all",
                        synced ? "bg-green-500/20 border-green-500/50 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400 animate-pulse"
                    )}>
                        <div className={clsx("w-2 h-2 rounded-full", synced ? "bg-green-500" : "bg-red-500")}></div>
                        {synced ? "Связь" : "Поиск..."}
                    </div>
                </div>
            </header>

            {/* QUICK ACTIONS (Signal) */}
            {synced && (
                <div className="px-6 mb-4 w-full text-center z-20 relative">
                    <button
                        onClick={async () => {
                            if (!profile?.id) return;
                            if (window.confirm("Отправить сигнал партнеру? 🔥")) {
                                const { error } = await supabase.from('profiles').update({ wants_intimacy_at: new Date() }).eq('id', profile.id);
                                if (!error) {
                                    alert("Сигнал отправлен! 😈");
                                    // Telegram Notification
                                    import('../services/telegramNotificationService').then(({ TelegramService }) => {
                                        TelegramService.notifyIntimacySignal(profile.partner_id, profile.first_name);
                                    });
                                }
                            }
                        }}
                        className="w-full py-4 bg-gradient-to-r from-red-600 to-pink-600 rounded-2xl shadow-[0_0_20px_rgba(220,38,38,0.5)] border border-white/20 text-white font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined filled animate-pulse">local_fire_department</span>
                        <span>Хочу секса</span>
                    </button>
                </div>
            )}

            <main className="flex-1 flex flex-col items-center p-6 gap-6 z-10 w-full max-w-md mx-auto">

                {/* Sync Button (Main Action if not synced) */}
                {!synced ? (
                    <div className="flex flex-col items-center gap-4 mt-20">
                        <button
                            onClick={handleSync}
                            className="relative w-40 h-40 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform group"
                        >
                            <div className="absolute inset-0 bg-red-600 rounded-full opacity-20 animate-ping"></div>
                            <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-red-900 rounded-full shadow-[0_0_50px_theme('colors.red.600')] border-4 border-red-500/50 flex items-center justify-center">
                                <span className="material-symbols-outlined text-6xl text-white drop-shadow-lg">lock_open</span>
                            </div>
                        </button>
                        <p className="text-white/50 text-sm font-medium uppercase tracking-widest">Нажми для входа</p>
                    </div>
                ) : (
                    /* Content after Sync */
                    <div className="w-full h-full flex flex-col">
                        {/* Tab Switcher */}
                        <div className="flex p-1 bg-black/40 rounded-full mb-6 border border-white/10 shrink-0 overflow-x-auto">
                            <button
                                onClick={() => setActiveTab('cards')}
                                className={clsx(
                                    "flex-1 py-2 px-4 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                                    activeTab === 'cards' ? "bg-red-600 text-white shadow-lg shadow-red-600/30" : "text-white/40 hover:text-white"
                                )}
                            >
                                Фантазии
                            </button>
                            <button
                                onClick={() => setActiveTab('dice')}
                                className={clsx(
                                    "flex-1 py-2 px-4 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                                    activeTab === 'dice' ? "bg-red-600 text-white shadow-lg shadow-red-600/30" : "text-white/40 hover:text-white"
                                )}
                            >
                                Кубики
                            </button>
                            <button
                                onClick={() => setActiveTab('kamasutra')}
                                className={clsx(
                                    "flex-1 py-2 px-4 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                                    activeTab === 'kamasutra' ? "bg-red-600 text-white shadow-lg shadow-red-600/30" : "text-white/40 hover:text-white"
                                )}
                            >
                                Камасутра
                            </button>
                        </div>

                        <div className="flex-1 relative">
                            {/* CARDS TAB */}
                            {activeTab === 'cards' && <FantasyDeck />}

                            {/* DICE TAB */}
                            {activeTab === 'dice' && <SexDice />}

                            {/* KAMASUTRA TAB */}
                            {activeTab === 'kamasutra' && <Kamasutra />}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default RedRoom;
