import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import OpenAI from 'openai';
import { useTelegramAuth } from '../../features/auth/TelegramAuth';
import { supabase } from '../../lib/supabase';

const ConflictManager = ({ onClose }) => {
    const { user, profile } = useTelegramAuth();
    const [view, setView] = useState('list'); // list, create, reply, view
    const [conflicts, setConflicts] = useState([]);
    const [selectedConflict, setSelectedConflict] = useState(null);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [aiResponse, setAiResponse] = useState('');

    // Fetch Conflicts
    useEffect(() => {
        if (!profile?.id) return;
        fetchConflicts();
    }, [profile?.id]);

    const fetchConflicts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('conflicts')
            .select(`
                *,
                initiator:initiator_id(first_name, photo_url),
                partner:partner_id(first_name, photo_url)
            `)
            .or(`initiator_id.eq.${profile.id},partner_id.eq.${profile.id}`)
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching conflicts:', error);
        else setConflicts(data || []);
        setLoading(false);
    };

    const handleCreate = async () => {
        if (!input.trim() || !profile) return;
        setLoading(true);
        const { error } = await supabase.from('conflicts').insert({
            initiator_id: profile.id,
            partner_id: profile.partner_id, // Might be null if not paired, but logic handles it
            initiator_description: input,
            status: 'pending_partner'
        });

        if (error) alert("Ошибка создания: " + error.message);
        else {
            setInput('');
            setView('list');
            fetchConflicts();
        }
        setLoading(false);
    };

    const handleReply = async () => {
        if (!input.trim() || !selectedConflict) return;
        setLoading(true);
        const { error } = await supabase
            .from('conflicts')
            .update({
                partner_description: input,
                status: 'ready_for_analysis'
            })
            .eq('id', selectedConflict.id);

        if (error) alert("Ошибка ответа: " + error.message);
        else {
            setInput('');
            // Optimistic update
            setSelectedConflict(prev => ({ ...prev, partner_description: input, status: 'ready_for_analysis' }));
            fetchConflicts();
        }
        setLoading(false);
    };

    const handleAnalyze = async () => {
        if (!selectedConflict) return;
        setLoading(true);

        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
        if (!apiKey) {
            alert("API Key missing");
            setLoading(false);
            return;
        }

        const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

        // Identify names
        const initName = selectedConflict.initiator?.first_name || "Initiator";
        const partName = selectedConflict.partner?.first_name || "Partner";
        const initText = selectedConflict.initiator_description;
        const partText = selectedConflict.partner_description;

        const prompt = `
        Ты - мудрый семейный психолог. Твои клиенты: ${initName} и ${partName}.
        
        Версия ${initName}: "${initText}"
        Версия ${partName}: "${partText}"

        Твоя задача:
        1. Проанализировать ситуации.
        2. Найти скрытые потребности обоих.
        3. Дать короткий, эмпатичный совет, как помириться.
        4. Сделать краткое "Sammury" проблемы (одной строкой) для истории.

        Ответ верни в формате JSON:
        {
            "analysis": "Текст совета в Markdown...",
            "summary": "Краткое описание проблемы"
        }
        `;

        try {
            const completion = await openai.chat.completions.create({
                messages: [{ role: "system", content: "Ты JSON-бот психолог." }, { role: "user", content: prompt }],
                model: "gpt-4o-mini",
                response_format: { type: "json_object" }
            });

            const result = JSON.parse(completion.choices[0].message.content);

            // Save to DB
            const { error } = await supabase
                .from('conflicts')
                .update({
                    ai_analysis: result.analysis,
                    ai_summary: result.summary,
                    status: 'analyzed'
                })
                .eq('id', selectedConflict.id);

            if (error) throw error;

            setSelectedConflict(prev => ({ ...prev, ...result, status: 'analyzed' }));
            fetchConflicts();

        } catch (error) {
            console.error("AI Error:", error);
            alert("Ошибка анализа: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Render Helpers
    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending_partner': return <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded">Ждем партнера</span>;
            case 'ready_for_analysis': return <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">Готов к анализу</span>;
            case 'analyzed': return <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded">Решено</span>;
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-surface-dark border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] h-[600px]">

                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        {view === 'list' && <span className="material-symbols-outlined text-purple-400">psychology</span>}
                        {view !== 'list' && (
                            <button onClick={() => setView('list')} className="w-8 h-8 flex items-center justify-center rounded-full active:bg-white/10">
                                <span className="material-symbols-outlined text-white">arrow_back</span>
                            </button>
                        )}
                        {view === 'list' ? 'Медиатор' : 'Разбор'}
                    </h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">

                    {/* LIST VIEW */}
                    {view === 'list' && (
                        <div className="flex flex-col gap-4 h-full">
                            {conflicts.length === 0 && !loading && (
                                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                                    <span className="material-symbols-outlined text-6xl mb-4">sentiment_satisfied</span>
                                    <p>В Багдаде все спокойно.<br />Конфликтов нет.</p>
                                </div>
                            )}

                            {conflicts.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => { setSelectedConflict(c); setView('view'); }}
                                    className="bg-white/5 p-4 rounded-xl border border-white/5 active:bg-white/10 transition-colors"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 text-[10px] flex items-center justify-center font-bold text-white">
                                                {c.initiator?.first_name?.[0]}
                                            </div>
                                            <span className="text-sm font-bold text-white max-w-[120px] truncate">
                                                {c.ai_summary || c.initiator_description}
                                            </span>
                                        </div>
                                        {getStatusBadge(c.status)}
                                    </div>
                                    <p className="text-xs text-white/40 line-clamp-2">
                                        {new Date(c.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            ))}

                            <button
                                onClick={() => setView('create')}
                                className="mt-auto w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white font-bold shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">add</span>
                                Новый Конфликт
                            </button>
                        </div>
                    )}

                    {/* CREATE VIEW */}
                    {view === 'create' && (
                        <div className="flex flex-col gap-4 animate-fade-in-right h-full">
                            <h3 className="text-white font-bold">Что случилось?</h3>
                            <p className="text-xs text-white/50">Опишите ситуацию со своей стороны.</p>
                            <textarea
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                className="flex-1 bg-black/20 p-4 rounded-xl text-white resize-none outline-none border border-white/10 focus:border-purple-500/50"
                                placeholder="Я чувствую..."
                            />
                            <button
                                onClick={handleCreate}
                                disabled={loading || !input.trim()}
                                className="w-full py-3 bg-purple-600 rounded-xl text-white font-bold disabled:opacity-50"
                            >
                                {loading ? 'Создаем...' : 'Отправить Партнеру'}
                            </button>
                        </div>
                    )}

                    {/* DETAIL / VIEW */}
                    {view === 'view' && selectedConflict && (
                        <div className="flex flex-col gap-4 animate-fade-in h-full">

                            {/* Analysis Result */}
                            {selectedConflict.status === 'analyzed' && (
                                <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl">
                                    <h3 className="font-bold text-purple-300 mb-2 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                                        Совет ИИ
                                    </h3>
                                    <div className="whitespace-pre-wrap font-sans text-sm text-white/90 leading-relaxed">
                                        {selectedConflict.ai_analysis}
                                    </div>
                                </div>
                            )}

                            {/* Initiator Blob */}
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-bold text-white/50">
                                        {selectedConflict.initiator?.first_name} пишет:
                                    </span>
                                </div>
                                <p className="text-sm text-white/80">{selectedConflict.initiator_description}</p>
                            </div>

                            {/* Partner Blob */}
                            {selectedConflict.partner_description ? (
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold text-white/50">
                                            {selectedConflict.partner?.first_name || 'Партнер'} отвечает:
                                        </span>
                                    </div>
                                    <div className={clsx("text-sm transition-all",
                                        // Simple logic: if I am initiator and haven't unlocked, blur? 
                                        // For MVP let's just show it if analyzed, or if I am the author.
                                        "text-white/80"
                                    )}>
                                        {selectedConflict.partner_description}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl border border-dashed border-white/10 text-center">
                                    <p className="text-xs text-white/40">Партнер еще не ответил</p>
                                    {profile?.id === selectedConflict.partner_id && (
                                        <button
                                            onClick={() => setView('reply')}
                                            className="mt-2 px-4 py-2 bg-white/10 rounded-lg text-white font-bold text-xs"
                                        >
                                            Ответить
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="mt-auto pt-4">
                                {selectedConflict.status === 'ready_for_analysis' && (
                                    <button
                                        onClick={handleAnalyze}
                                        disabled={loading}
                                        className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white font-bold shadow-lg shadow-green-500/20"
                                    >
                                        {loading ? 'Анализ...' : 'Анализировать (ИИ)'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* REPLY VIEW */}
                    {view === 'reply' && (
                        <div className="flex flex-col gap-4 animate-fade-in-right h-full">
                            <h3 className="text-white font-bold">Ваш взгляд</h3>
                            <p className="text-xs text-white/50">Как ситуация выглядит с вашей стороны?</p>
                            <textarea
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                className="flex-1 bg-black/20 p-4 rounded-xl text-white resize-none outline-none border border-white/10 focus:border-purple-500/50"
                                placeholder="Я думаю..."
                            />
                            <button
                                onClick={handleReply}
                                disabled={loading || !input.trim()}
                                className="w-full py-3 bg-purple-600 rounded-xl text-white font-bold disabled:opacity-50"
                            >
                                {loading ? 'Отправка...' : 'Отправить'}
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default ConflictManager;
