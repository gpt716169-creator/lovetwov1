import React, { useState, useEffect } from 'react';
import { differenceInDays, differenceInHours, parseISO, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { useTelegramAuth } from '../auth/TelegramAuth';

const RelationshipCounter = () => {
    const { profile } = useTelegramAuth();
    const [timeTogether, setTimeTogether] = useState({ days: 0, hours: 0 });
    const [startDate, setStartDate] = useState('2024-01-01');
    const [isEditing, setIsEditing] = useState(false);
    const [editDateValue, setEditDateValue] = useState('');

    useEffect(() => {
        if (profile?.relationship_start) {
            setStartDate(profile.relationship_start);
        }
    }, [profile]);

    useEffect(() => {
        const calculateTime = () => {
            const now = new Date();
            const start = parseISO(startDate);

            const days = differenceInDays(now, start);
            const hours = differenceInHours(now, start) % 24;

            setTimeTogether({ days, hours });
        };

        calculateTime();
        const timer = setInterval(calculateTime, 60000); // Update every minute
        return () => clearInterval(timer);
    }, [startDate]);

    const handleSaveDate = async () => {
        if (!editDateValue || !profile?.id) return;

        const { error } = await supabase
            .from('profiles')
            .update({ relationship_start: editDateValue })
            .eq('id', profile.id);

        if (!error) {
            setStartDate(editDateValue);
            setIsEditing(false);
        } else {
            alert("Ошибка сохранения: " + error.message);
        }
    };

    if (isEditing) {
        return (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-lg flex flex-col gap-2 animate-fade-in">
                <span className="text-xs text-neutral-400 uppercase font-bold">Дата начала</span>
                <input
                    type="date"
                    value={editDateValue}
                    onChange={e => setEditDateValue(e.target.value)}
                    className="w-full bg-black/20 text-white p-2 rounded-lg border border-white/10 outline-none"
                />
                <div className="flex gap-2">
                    <button
                        onClick={handleSaveDate}
                        className="flex-1 bg-primary text-white text-xs font-bold py-2 rounded-lg"
                    >
                        Сохранить
                    </button>
                    <button
                        onClick={() => setIsEditing(false)}
                        className="flex-1 bg-white/10 text-white/50 text-xs font-bold py-2 rounded-lg"
                    >
                        Отмена
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={() => { setEditDateValue(startDate); setIsEditing(true); }}
            className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-lg flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors group relative overflow-hidden"
        >
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-all"></div>
            <div className="relative z-10">
                <h2 className="text-xs text-neutral-400 uppercase tracking-wider font-bold mb-1">
                    Вместе с {format(parseISO(startDate), 'd MMMM yyyy', { locale: ru })}
                </h2>
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-white tabular-nums drop-shadow-lg">{timeTogether.days}</span>
                    <span className="text-sm text-neutral-500 font-medium">дней</span>
                </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-white/5 flex items-center justify-center text-pink-500 shadow-glow relative z-10">
                <span className="material-symbols-outlined filled animate-pulse-slow">favorite</span>
            </div>
        </div>
    );
};

export default RelationshipCounter;
