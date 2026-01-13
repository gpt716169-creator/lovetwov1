import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { clsx } from 'clsx';
import { useTelegramAuth } from '../auth/TelegramAuth';

const PartnerRatingWidget = () => {
    const { profile } = useTelegramAuth();
    const [hasRated, setHasRated] = useState(false);
    const [rating, setRating] = useState(0);
    const [partnerRating, setPartnerRating] = useState(null); // What partner gave ME
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (profile?.id && profile?.partner_id) {
            fetchTodayRatings();
        }
    }, [profile]);

    const fetchTodayRatings = async () => {
        const today = new Date().toISOString().split('T')[0];

        // 1. My rating for partner
        const { data: myData } = await supabase
            .from('partner_ratings')
            .select('score')
            .eq('rater_id', profile.id)
            .eq('date', today)
            .single();

        if (myData) {
            setRating(myData.score);
            setHasRated(true);
        }

        // 2. Partner's rating for me
        const { data: theirData } = await supabase
            .from('partner_ratings')
            .select('score')
            .eq('rater_id', profile.partner_id)
            .eq('date', today)
            .single();

        if (theirData) {
            setPartnerRating(theirData.score);
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
            // Re-fetch to check if partner also rated
            fetchTodayRatings();
        }
        setLoading(false);
    };

    return (
        <div className="glass-panel p-5 rounded-3xl relative overflow-hidden">
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-white text-base font-bold mb-1">
                            {hasRated ? "Ваша оценка" : "Оцени день"}
                        </h3>
                        <p className="text-white/40 text-xs">
                            {hasRated ? "Вы оценили партнера." : "Как прошел день с партнером?"}
                        </p>
                    </div>
                    {/* Partner's Rating Display */}
                    {partnerRating !== null ? (
                        <div className="flex flex-col items-end animate-fade-in">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                {partnerRating}
                            </div>
                            <span className="text-[10px] text-green-400 font-bold mt-1">Оценка Вас</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-end opacity-50">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/20 font-bold text-lg border border-white/5">
                                ?
                            </div>
                            <span className="text-[10px] text-white/30 mt-1">Ждем оценку</span>
                        </div>
                    )}
                </div>

                <div className="flex justify-between gap-1 overflow-x-auto hide-scrollbar pb-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                        <button
                            key={val}
                            disabled={loading}
                            onClick={() => handleRate(val)}
                            className={clsx(
                                "w-8 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all shrink-0",
                                rating === val
                                    ? "bg-primary text-white shadow-lg scale-110"
                                    : hasRated
                                        ? "bg-white/5 text-white/20" // Allow re-rating but dim
                                        : "bg-white/10 text-white/60 hover:bg-primary/50 hover:text-white"
                            )}
                        >
                            {val}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PartnerRatingWidget;
