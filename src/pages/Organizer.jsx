import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { useTelegramAuth } from '../features/auth/TelegramAuth';
import PageTransition from '../components/PageTransition';

const Organizer = () => {
    // State
    const { user, profile } = useTelegramAuth();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modals
    const [isAddMode, setIsAddMode] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // New Event State
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventType, setNewEventType] = useState('date'); // default

    const EVENT_TYPES = [
        { id: 'cycle', label: 'Цикл', icon: 'water_drop', color: 'bg-red-500', dot: 'bg-red-500' },
        { id: 'date', label: 'Свидание', icon: 'favorite', color: 'bg-blue-500', dot: 'bg-blue-400' },
        { id: 'birthday', label: 'ДР', icon: 'cake', color: 'bg-purple-500', dot: 'bg-purple-400' },
        { id: 'holiday', label: 'Праздник', icon: 'celebration', color: 'bg-green-500', dot: 'bg-green-400' },
        { id: 'anniversary', label: 'Годовщина', icon: 'event', color: 'bg-amber-500', dot: 'bg-amber-400' },
    ];

    useEffect(() => {
        if (profile?.id) fetchEvents();
    }, [profile, currentMonth]);

    const fetchEvents = async () => {
        if (!profile?.id) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('user_id', profile.id);

        if (error) console.error("Error fetching events:", error);
        else setEvents(data || []);
        setLoading(false);
    };

    const addEvent = async () => {
        let title = newEventTitle;

        // Auto-title for Cycle
        if (newEventType === 'cycle') {
            title = 'Месячные';
        } else if (!title.trim()) {
            return;
        }

        const { error } = await supabase
            .from('events')
            .insert({
                user_id: profile.id,
                title: title,
                event_date: format(selectedDate, 'yyyy-MM-dd'),
                type: newEventType
            });

        if (error) {
            alert('Ошибка при создании события');
            console.error(error);
        } else {
            setNewEventTitle('');
            setIsAddMode(false);
            fetchEvents();
        }
    };

    const deleteEvent = async (id) => {
        await supabase.from('events').delete().eq('id', id);
        fetchEvents();
    };

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const days = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
    });

    const getEventForDay = (day) => {
        if (!isSameMonth(day, currentMonth)) return null;
        return events.filter(e => isSameDay(new Date(e.event_date), day));
    };

    const handleDayClick = (day) => {
        setSelectedDate(day);
        const dayEvents = getEventForDay(day);
        // If clicking a day, open details modal regardless of events?
        // User said "When opening events let it open at top". 
        // Showing modal is best.
        setIsDetailsOpen(true);
    };

    return (
        <PageTransition className="flex flex-col h-full bg-background-light dark:bg-background-dark min-h-screen pb-24 text-slate-900 dark:text-white relative">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-6 sticky top-0 z-20 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md">
                <h2 className="text-2xl font-extrabold tracking-tight">Календарь</h2>
                <div className="w-10"></div> {/* Spacer balance */}
            </header>

            <main className="flex-1 px-4 overflow-y-auto no-scrollbar">

                {/* Calendar Navigation */}
                <div className="flex items-center justify-between mb-6 px-2">
                    <button onClick={prevMonth} className="p-2 hover:bg-white/5 rounded-full text-white/60 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <h3 className="text-lg font-bold capitalize">
                        {format(currentMonth, 'LLLL yyyy', { locale: ru })}
                    </h3>
                    <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-full text-white/60 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                </div>

                {/* Days of Week */}
                <div className="grid grid-cols-7 mb-2 px-2">
                    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                        <div key={day} className="text-center text-xs font-bold text-white/30 uppercase tracking-widest py-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-y-4 gap-x-1 px-2 mb-8">
                    {days.map((day) => {
                        const isSelected = isSameDay(day, selectedDate);
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const dayEvents = getEventForDay(day) || [];

                        // Check Types
                        const isCycle = dayEvents.some(e => e.type === 'cycle');

                        // Other events (for dots)
                        const dotEvents = dayEvents.filter(e => e.type !== 'cycle');
                        const hasOtherEvents = dotEvents.length > 0;

                        return (
                            <div key={day.toString()} className="flex flex-col items-center gap-1 relative min-h-[40px]">
                                <button
                                    onClick={() => handleDayClick(day)}
                                    className={clsx(
                                        "w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium transition-all relative z-10",
                                        !isCurrentMonth && "text-white/10",
                                        // Base styles
                                        isCurrentMonth && !isCycle && !isSelected && "text-white/80 hover:bg-white/5",
                                        // Selected state (overrides others usually, but Cycle should trigger Red BG)
                                        isSelected && !isCycle && "bg-white text-slate-900 font-bold shadow-lg",
                                        isToday(day) && !isSelected && !isCycle && "border border-primary text-primary",

                                        // CYCLE LOGIC: Red Background always
                                        isCycle && "bg-red-500 text-white font-bold shadow-[0_0_10px_rgba(239,68,68,0.4)]",
                                        isCycle && isSelected && "ring-2 ring-white"
                                    )}
                                >
                                    {format(day, 'd')}

                                    {/* Event Dots (if Cycle is active, we still show dots for CONFLICTS) */}
                                    <div className="absolute -bottom-1 flex gap-0.5 justify-center">
                                        {dotEvents.slice(0, 3).map((ev, i) => {
                                            const typeConfig = EVENT_TYPES.find(t => t.id === ev.type);
                                            return (
                                                <div key={i} className={clsx("w-1 h-1 rounded-full", typeConfig?.dot || 'bg-white')}></div>
                                            );
                                        })}
                                    </div>
                                </button>
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* DETAILS MODAL (Opens at top as overlay) */}
            <AnimatePresence>
                {isDetailsOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsDetailsOpen(false)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#1e1e1e] border border-white/10 w-full max-w-sm rounded-3xl p-5 shadow-2xl overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h4 className="text-2xl font-bold text-white">
                                        {format(selectedDate, 'd MMMM', { locale: ru })}
                                    </h4>
                                    <p className="text-white/40 text-xs font-bold uppercase tracking-wider">
                                        {format(selectedDate, 'EEEE', { locale: ru })}
                                    </p>
                                </div>
                                <button onClick={() => setIsDetailsOpen(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white/50">close</span>
                                </button>
                            </div>

                            {/* Event List */}
                            <div className="flex flex-col gap-3 mb-6 max-h-[200px] overflow-y-auto">
                                {getEventForDay(selectedDate)?.length > 0 ? (
                                    getEventForDay(selectedDate).map(ev => {
                                        const typeConfig = EVENT_TYPES.find(t => t.id === ev.type);
                                        return (
                                            <div key={ev.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center text-white", typeConfig?.color)}>
                                                        <span className="material-symbols-outlined text-lg">{typeConfig?.icon}</span>
                                                    </div>
                                                    <div>
                                                        <h5 className="text-white font-bold text-sm">{ev.title}</h5>
                                                        <p className="text-white/40 text-xs capitalize">{typeConfig?.label}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => deleteEvent(ev.id)} className="text-red-400 hover:text-red-300">
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-white/30 text-center py-4 text-sm">Событий нет</div>
                                )}
                            </div>

                            {/* Add Button triggers Sub-Mode within Modal */}
                            <button
                                onClick={() => { setIsDetailsOpen(false); setIsAddMode(true); }}
                                className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">add</span>
                                Добавить событие
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ADD EVENT MODAL */}
            <AnimatePresence>
                {isAddMode && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 50, opacity: 0 }}
                            className="bg-[#1e1e1e] border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Новое событие</h3>
                                <button onClick={() => setIsAddMode(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white/50">close</span>
                                </button>
                            </div>

                            <div className="flex flex-col gap-4">
                                {/* Type Selector */}
                                <div className="grid grid-cols-3 gap-2">
                                    {EVENT_TYPES.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setNewEventType(t.id)}
                                            className={clsx(
                                                "flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all h-20",
                                                newEventType === t.id
                                                    ? `${t.color} border-transparent text-white shadow-lg`
                                                    : "border-white/10 bg-white/5 text-white/40 hover:bg-white/10"
                                            )}
                                        >
                                            <span className="material-symbols-outlined text-xl">{t.icon}</span>
                                            <span className="text-[10px] font-bold uppercase">{t.label}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Title Input (Hidden for Cycle) */}
                                {newEventType !== 'cycle' && (
                                    <div className="animate-fade-in">
                                        <label className="text-xs font-bold text-white/40 uppercase ml-1 block mb-2">Название</label>
                                        <input
                                            type="text"
                                            value={newEventTitle}
                                            onChange={(e) => setNewEventTitle(e.target.value)}
                                            placeholder="Например, ужин..."
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-white/30 outline-none"
                                            autoFocus
                                        />
                                    </div>
                                )}

                                <button
                                    onClick={addEvent}
                                    className="mt-4 w-full py-4 bg-green-500 hover:bg-green-600 rounded-xl font-bold text-white shadow-lg shadow-green-500/20"
                                >
                                    Сохранить
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </PageTransition>
    );
};

export default Organizer;
