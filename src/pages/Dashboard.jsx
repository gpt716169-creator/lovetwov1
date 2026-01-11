import React, { useState, useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';
import { useTelegramAuth } from '../features/auth/TelegramAuth';
import { supabase } from '../lib/supabase';
import { useEconomyStore } from '../store/economyStore';
import { clsx } from 'clsx';
import PageTransition from '../components/PageTransition';

import RelationshipCounter from '../features/dashboard/RelationshipCounter';
import ImpulseButton from '../features/dashboard/ImpulseButton';
import PartnerRatingWidget from '../features/dashboard/PartnerRatingWidget';
import GoalsWidget from '../features/dashboard/GoalsWidget';

const Dashboard = () => {
    const { toggleTheme } = useThemeStore();
    const { user, profile, getInviteLink } = useTelegramAuth();
    const { balance, fetchEconomyData } = useEconomyStore();
    const [mood, setMood] = useState('Loved');
    const [score, setScore] = useState(4.5);
    const [partnerStats, setPartnerStats] = useState({ mood: null, score: null });
    const [partnerSignal, setPartnerSignal] = useState(false);

    useEffect(() => {
        if (user) {
            fetchEconomyData(user.id);
        }
        if (profile?.id) {
            fetchDailyStats(profile.id);
            if (profile.partner_id) {
                fetchPartnerStats(profile.partner_id);
                fetchPartnerSignal(profile.partner_id);
            }
        }
    }, [user, profile]);

    const fetchDailyStats = async (profileId) => {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
            .from('daily_stats')
            .select('*')
            .eq('user_id', profileId)
            .eq('date', today)
            .single();

        if (data) {
            if (data.mood_label) setMood(data.mood_label);
            if (data.day_score) setScore(Number(data.day_score));
        }
    };

    const fetchPartnerStats = async (partnerId) => {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
            .from('daily_stats')
            .select('mood_label, day_score')
            .eq('user_id', partnerId)
            .eq('date', today)
            .single();

        if (data) {
            setPartnerStats({ mood: data.mood_label, score: data.day_score });
        }
        if (data) {
            setPartnerStats({ mood: data.mood_label, score: data.day_score });
        }
    };

    const fetchPartnerSignal = async (partnerId) => {
        const { data } = await supabase
            .from('profiles')
            .select('wants_intimacy_at')
            .eq('id', partnerId)
            .single();

        if (data?.wants_intimacy_at) {
            const signalTime = new Date(data.wants_intimacy_at);
            const diffMinutes = (new Date() - signalTime) / (1000 * 60);
            if (diffMinutes < 240) { // 4 hours active
                setPartnerSignal(true);
            }
        }
    };

    const updateUnifiedStats = async (newMood, newScore) => {
        if (!profile?.id) return;
        const today = new Date().toISOString().split('T')[0];

        const { error } = await supabase
            .from('daily_stats')
            .upsert({
                user_id: profile.id,
                date: today,
                mood_label: newMood,
                day_score: newScore
            }, { onConflict: 'user_id,date' });

        if (error) console.error('Error saving stats:', error);
    };

    const handleMoodChange = (label) => {
        setMood(label);
        updateUnifiedStats(label, score);
    };

    const handleScoreChange = (val) => {
        setScore(val);
        updateUnifiedStats(mood, val);
    };

    const displayName = user ? `${user.first_name}` : "Любимый";
    const avatarUrl = user?.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'User'}`;

    // Copy Invite Logic
    const copyInvite = () => {
        const link = getInviteLink();
        navigator.clipboard.writeText(link);
        alert("Ссылка приглашения скопирована! Отправь её партнеру.");
    };

    if (!user) {
        return (
            <PageTransition className="flex items-center justify-center min-h-screen">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </PageTransition>
        );
    }

    return (
        <PageTransition className="flex flex-col gap-4 px-4 mt-2 pt-8 pb-32">
            {/* Header Section */}
            <header className="flex items-start justify-between px-2">
                <div className="flex flex-col gap-1">
                    <h2 className="text-white/60 text-sm font-medium uppercase tracking-wider">Добрый вечер,</h2>
                    <h1 className="text-white text-2xl font-bold leading-tight cursor-pointer" onClick={toggleTheme}>
                        {displayName}
                    </h1>
                </div>
                {/* Avatar Group */}
                <div className="flex items-center -space-x-3" onClick={copyInvite}>
                    <div className="overflow-hidden w-12 h-12 rounded-full border-2 border-background-dark ring-2 ring-primary/20 relative z-10 transition-transform hover:scale-105">
                        <img alt="Ваш Аватар" className="w-full h-full object-cover" src={avatarUrl} />
                    </div>

                    {profile?.partner_id ? (
                        <div className="overflow-hidden w-12 h-12 rounded-full border-2 border-background-dark ring-2 ring-primary/20 relative z-0">
                            {/* Assuming partner photo might not be synced yet, use generic or initial */}
                            <img alt="Партнер" className="w-full h-full object-cover" src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.partner_id}`} />
                        </div>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); copyInvite(); }}
                            className="overflow-hidden w-12 h-12 rounded-full border-2 border-background-dark ring-2 ring-primary/20 relative z-0 flex items-center justify-center bg-surface-dark hover:bg-white/10 transition-colors"
                        >
                            <span className="material-symbols-outlined text-white/50 text-sm animate-pulse">link</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Partner Status Snipet */}
            {profile?.partner_id && (
                <div className="px-2 flex items-center gap-4 text-xs font-bold text-white/40">
                    <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">sentiment_satisfied</span>
                        <span>{partnerStats.mood || "???"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">star</span>
                        <span>{partnerStats.score || "?"}/10</span>
                    </div>
                </div>
            )}

            {/* INTIMACY SIGNAL NOTIFICATION */}
            {partnerSignal && (
                <div className="mx-2 mt-2 p-4 bg-gradient-to-r from-red-600 to-pink-600 rounded-2xl shadow-[0_0_20px_rgba(220,38,38,0.6)] flex items-center justify-between text-white animate-pulse-slow relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <span className="material-symbols-outlined text-2xl animate-bounce">local_fire_department</span>
                        </div>
                        <div>
                            <h3 className="font-black uppercase tracking-wider text-sm">Партнер хочет близости!</h3>
                            <p className="text-[10px] text-white/80 font-medium">Сигнал из Красной Комнаты 🔥</p>
                        </div>
                    </div>
                </div>
            )}

            {/* LoveCoins Balance */}
            <div className="flex px-2">
                <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 shadow-sm">
                    <span className="material-symbols-outlined text-gold filled">monetization_on</span>
                    <span className="text-gold font-bold text-sm tracking-wide">{balance} ЛавКоинов</span>
                </div>
            </div>

            {/* Row 1: RelationshipsCounter (Editable) */}
            <RelationshipCounter />

            {/* Row 2: Grid Split (Pulse & Goals) */}
            <div className="grid grid-cols-2 gap-4">
                {/* Pulse Button Card */}
                <div className="glass-panel rounded-3xl p-4 flex flex-col justify-between aspect-square relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50 pointer-events-none"></div>
                    <span className="text-white/60 text-xs font-bold uppercase relative z-10">Импульсы</span>
                    <ImpulseButton />
                </div>

                {/* Goals Widget */}
                <GoalsWidget />
            </div>

            {/* Row 3: Partner Rating Widget */}
            <PartnerRatingWidget />

            {/* Row 4: My Stats (Mood & Score) */}
            <div className="glass-panel rounded-3xl p-5">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white text-base font-bold">Моё состояние</h3>
                </div>

                {/* Mood Selector */}
                <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4">
                    {[
                        { emoji: '🥰', label: 'Супер' },
                        { emoji: '😌', label: 'Норм' },
                        { emoji: '⚡', label: 'Заряд' },
                        { emoji: '🥱', label: 'Устал' },
                    ].map((m) => (
                        <button
                            key={m.label}
                            onClick={() => handleMoodChange(m.label)}
                            className={clsx(
                                "flex flex-col items-center gap-2 min-w-[60px] group transition-all",
                                mood === m.label ? "opacity-100 scale-105" : "opacity-60 hover:opacity-100"
                            )}
                        >
                            <div className={clsx(
                                "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all",
                                mood === m.label
                                    ? "bg-primary/20 border-2 border-primary shadow-[0_0_15px_theme('colors.primary')/0.3]"
                                    : "bg-white/5 border border-transparent hover:border-white/20"
                            )}>
                                {m.emoji}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Day Rating Slider */}
                <div className="mt-2">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-white/40 uppercase font-bold">Мой день</span>
                        <span className="text-primary font-bold">{score}</span>
                    </div>

                    <div className="relative h-10 w-full flex items-center justify-between px-1">
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-white/10 rounded-full -translate-y-1/2 z-0"></div>
                        <div
                            className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-primary/50 to-primary rounded-full -translate-y-1/2 z-0"
                            style={{ width: `${(score / 10) * 100}%` }}
                        ></div>

                        {[2, 4, 6, 8, 10].map((star) => (
                            <div
                                key={star}
                                onClick={() => handleScoreChange(star)}
                                className={clsx(
                                    "relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-all cursor-pointer",
                                    score >= star
                                        ? "bg-primary text-white shadow-lg shadow-primary/40"
                                        : "bg-surface-dark border-2 border-primary text-primary"
                                )}
                            >
                                {star}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </PageTransition>
    );
};

export default Dashboard;
