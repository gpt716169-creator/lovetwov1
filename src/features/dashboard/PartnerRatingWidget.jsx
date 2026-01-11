import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { clsx } from 'clsx';
import { useTelegramAuth } from '../auth/TelegramAuth';

const PartnerRatingWidget = () => {
    const { profile } = useTelegramAuth();
    const [hasRated, setHasRated] = useState(false);
    const [rating, setRating] = useState(0); // 0 means not rated today
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (profile?.id && profile?.partner_id) {
            fetchTodayRating();
        }
    }, [profile]);

    const fetchTodayRating = async () => {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
            .from('partner_ratings')
            .select('score')
            .eq('rater_id', profile.id)
            .eq('date', today)
            .single();

        if (data) {
            setRating(data.score);
            setHasRated(true);
        }
    };

    const handleRate = async (score) => {
        if (!profile?.id || !profile?.partner_id) {
            alert("Нет партнера для оценки");
            return;
        }

        setLoading(true);
        const today = new Date().toISOString().split('T')[0];

        const { error } = await supabase
            .from('partner_ratings')
            .upsert({
                rater_id: profile.id,
                rated_id: profile.partner_id,
                date: today,
                score: score
            }, { onConflict: 'rater_id,date' });

        if (error) {
            console.error(error);
            alert("Ошибка");
        } else {
            setRating(score);
            setHasRated(true);
        }
        setLoading(false);
    };

    return (
        <div className="glass-panel p-5 rounded-3xl">
            <h3 className="text-white text-base font-bold mb-1">
                {hasRated ? "Ваша оценка партнеру" : "Оцени партнера сегодня"}
            </h3>
            <p className="text-white/40 text-xs mb-4">
                {hasRated ? "Вы уже поставили оценку." : "Как он(а) себя вел(а)? (1-10)"}
            </p>

            <div className="flex justify-between gap-1 overflow-x-auto hide-scrollbar pb-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                    <button
                        key={val}
                        disabled={loading || hasRated} // Disable if already rated, unless we want to allow re-rating (upsert handles it, so maybe allow?)
                        onClick={() => handleRate(val)}
                        className={clsx(
                            "w-8 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all shrink-0",
                            rating === val
                                ? "bg-primary text-white shadow-lg scale-110"
                                : hasRated
                                    ? "bg-white/5 text-white/20 opacity-50"
                                    : "bg-white/10 text-white/60 hover:bg-primary/50 hover:text-white"
                        )}
                    >
                        {val}
                    </button>
                ))}
            </div>

            {hasRated && (
                <div className="mt-2 text-center text-green-400 text-xs font-bold animate-fade-in">
                    Спасибо! Оценка сохранена.
                </div>
            )}
        </div>
    );
};

export default PartnerRatingWidget;
