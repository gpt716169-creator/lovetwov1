import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTelegramAuth } from '../auth/TelegramAuth';
import clsx from 'clsx';
import OpenAI from 'openai';
import { AnimatePresence, motion } from 'framer-motion';

const QuizzesList = () => {
    const { profile } = useTelegramAuth();
    const [quizzes, setQuizzes] = useState([]);
    const [activeAttempts, setActiveAttempts] = useState([]);
    const [view, setView] = useState('list'); // list, play_init, play_partner, create, result, ai_processing
    const [currentQuiz, setCurrentQuiz] = useState(null);
    const [currentAttempt, setCurrentAttempt] = useState(null);
    const [answers, setAnswers] = useState({});
    const [step, setStep] = useState(0);
    const [customTitle, setCustomTitle] = useState('');
    const [customQuestions, setCustomQuestions] = useState([{ question: '', options: ['', '', '', ''] }]);

    // AI Analysis State
    const [aiResult, setAiResult] = useState(null);

    useEffect(() => {
        fetchQuizzes();
        if (profile?.id) {
            fetchAttempts();
            // Subscribe to updates for real-time status changes
            const channel = supabase.channel('quiz_attempts')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_attempts' }, fetchAttempts)
                .subscribe();
            return () => supabase.removeChannel(channel);
        }
    }, [profile]);

    const fetchQuizzes = async () => {
        const { data } = await supabase.from('quizzes').select('*').order('created_at', { ascending: true });
        if (data) setQuizzes(data);
    };

    const fetchAttempts = async () => {
        const { data } = await supabase.from('quiz_attempts')
            .select('*, quiz:quizzes(*), initiator:initiator_id(first_name), partner:partner_id(first_name)')
            .or(`initiator_id.eq.${profile.id},partner_id.eq.${profile.id}`)
            .order('created_at', { ascending: false }); // Show newest first
        if (data) setActiveAttempts(data);
    };

    // --- GAME FLOW START ---

    const startQuizAsInitiator = (quiz) => {
        setCurrentQuiz(quiz);
        setAnswers({});
        setStep(0);
        setView('play_init');
    };

    const playAsPartner = (attempt) => {
        setCurrentAttempt(attempt);
        setCurrentQuiz(attempt.quiz);
        setAnswers({});
        setStep(0);
        setView('play_partner');
    };

    const viewResult = (attempt) => {
        setCurrentAttempt(attempt);
        setCurrentQuiz(attempt.quiz);
        setView('result');
    };

    // --- GAMEPLAY LOGIC ---

    const handleAnswer = (option, isCustomInput = false) => {
        // If option is string, save it directly (for "Custom variant" inputs later if we support them fully)
        // For now, index or string.
        // User asked for "Svoi variant" (Own answer).
        // Let's assume options are strings mostly.
        const val = isCustomInput ? option : currentQuiz.questions[step].options.indexOf(option);

        setAnswers(prev => ({ ...prev, [step]: val }));

        if (step < currentQuiz.questions.length - 1) {
            setStep(prev => prev + 1);
        } else {
            // Finished
            if (view === 'play_init') submitInitiator(val); // pass last val to update state before submit? 
            if (view === 'play_partner') submitPartner(val);
        }
    };

    // Correction: State update is async, so handleAnswer might not have the last answer in 'answers' yet.
    // Better to have specific submit functions that take the final answer set.
    // Simplified: Just wait for user to click "Finish" or auto-submit.
    // I'll make the last step show a "Finish" button.

    // Actually, let's use a "Finish" button on the last step for clarity.

    const submitInitiator = async (finalAnswerVal) => {
        const finalAnswers = { ...answers, [step]: finalAnswerVal }; // Include last step

        await supabase.from('quiz_attempts').insert({
            quiz_id: currentQuiz.id,
            initiator_id: profile.id,
            partner_id: profile.partner_id,
            initiator_answers: finalAnswers,
            status: 'waiting_partner'
        });
        setView('list');
        alert("Ответы сохранены! Теперь партнер должен угадать их.");
    };

    const submitPartner = async (finalAnswerVal) => {
        const finalGuesses = { ...answers, [step]: finalAnswerVal };

        await supabase.from('quiz_attempts')
            .update({
                partner_guesses: finalGuesses,
                status: 'completed' // Ready for analysis
            })
            .eq('id', currentAttempt.id);

        setView('list');
        // Trigger AI analysis immediately? Or let user click button in Result view.
        // Let's let them click button.
    };

    // --- AI ANALYSIS ---
    const runAiAnalysis = async (attempt) => {
        setView('ai_processing');
        try {
            const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
            const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

            const quizPoints = attempt.quiz.questions.map((q, i) => {
                const initAnsIdx = attempt.initiator_answers[i];
                const partGuessIdx = attempt.partner_guesses[i];
                const initAns = q.options[initAnsIdx] || "Свой ответ"; // Handle text inputs if implemented
                const partGuess = q.options[partGuessIdx] || "Свой ответ";
                return `Вопрос: ${q.question}. ${attempt.initiator?.first_name} выбрал: "${initAns}". ${attempt.partner?.first_name || 'Партнер'} думал, что выберет: "${partGuess}".`;
            }).join('\n');

            const prompt = `
            Ты - семейный психолог. Проанализируй результаты квиза "${attempt.quiz.title}".
            
            Данные:
            ${quizPoints}
            
            Задача:
            1. Найди, где пара совпала (хорошее понимание).
            2. Найди разрывы (где партнер ошибся в предположениях). Что это значит?
            3. Дай конкретный совет паре, исходя из их ответов (например, про языки любви).
            
            Формат ответа JSON:
            {
                "summary": "Краткий вывод",
                "detailed_analysis": "Развернутый совет..."
            }
            `;

            const completion = await openai.chat.completions.create({
                messages: [{ role: "system", content: "Ты JSON-психолог." }, { role: "user", content: prompt }],
                model: "gpt-4o-mini",
                response_format: { type: "json_object" }
            });

            const result = JSON.parse(completion.choices[0].message.content);
            setAiResult(result);
            setView('result'); // Back to result view with AI data ready
            setCurrentAttempt(attempt);

        } catch (e) {
            console.error(e);
            alert("AI Error: " + e.message);
            setView('list');
        }
    };

    // --- CUSTOM QUIZ ---
    const addCustomQuestion = () => {
        setCustomQuestions([...customQuestions, { question: '', options: ['', '', '', ''] }]);
    };

    const updateCustomQuestion = (idx, field, value) => {
        const newQs = [...customQuestions];
        newQs[idx][field] = value;
        setCustomQuestions(newQs);
    };

    const updateCustomOption = (qIdx, oIdx, value) => {
        const newQs = [...customQuestions];
        newQs[qIdx].options[oIdx] = value;
        setCustomQuestions(newQs);
    };

    const saveCustomQuiz = async () => {
        if (!customTitle) return;
        await supabase.from('quizzes').insert({
            title: customTitle,
            description: 'Пользовательский квиз',
            questions: customQuestions,
            created_by: profile.id,
            is_system: false
        });
        setView('list');
        fetchQuizzes();
    };

    // --- RENDER ---

    return (
        <div className="flex flex-col gap-6 pb-20 min-h-[500px]">
            {view === 'list' && (
                <>
                    {/* Active Attempts */}
                    {activeAttempts.length > 0 && (
                        <div>
                            <h3 className="text-white/60 font-bold uppercase text-xs mb-2 pl-1">История / Активные</h3>
                            <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar">
                                {activeAttempts.map(att => {
                                    const isInit = att.initiator_id === profile.id;
                                    const isWaiting = att.status === 'waiting_partner';
                                    const canPlay = !isInit && isWaiting;
                                    const isDone = att.status === 'completed';

                                    return (
                                        <button
                                            key={att.id}
                                            onClick={() => {
                                                if (canPlay) playAsPartner(att);
                                                else if (isDone) viewResult(att);
                                                else alert("Ждем партнера...");
                                            }}
                                            className={clsx(
                                                "bg-surface-dark border rounded-xl p-3 min-w-[160px] text-left relative overflow-hidden shrink-0 transition-opacity",
                                                canPlay ? "border-primary animate-pulse-slow" : "border-white/10",
                                                isDone ? "opacity-80" : "opacity-100"
                                            )}
                                        >
                                            <p className="text-white font-bold text-sm truncate pr-2">{att.quiz?.title}</p>
                                            <p className="text-white/40 text-[10px] mt-1">
                                                {isDone ? "Завершено • Результат" :
                                                    canPlay ? "Ваш ход! Угадайте ответы" :
                                                        "Ждем партнера..."}
                                            </p>
                                            {isDone && <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full"></span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Quiz Library */}
                    <div className="grid grid-cols-2 gap-3">
                        {quizzes.map(quiz => (
                            <button
                                key={quiz.id}
                                onClick={() => startQuizAsInitiator(quiz)}
                                className="relative h-[160px] rounded-2xl overflow-hidden group text-left p-4 flex flex-col justify-end shadow-lg"
                            >
                                <div className={clsx("absolute inset-0 transition-transform group-hover:scale-110 bg-gradient-to-br",
                                    quiz.is_system ? "from-indigo-500 to-purple-600" : "from-emerald-500 to-teal-600"
                                )}></div>
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>

                                <div className="relative z-10">
                                    <h3 className="text-white font-bold text-lg leading-tight mb-1 line-clamp-2">{quiz.title}</h3>
                                    <p className="text-white/70 text-xs line-clamp-2">{quiz.description}</p>
                                </div>
                            </button>
                        ))}

                        <button onClick={() => setView('create')} className="h-[160px] rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-colors">
                            <span className="material-symbols-outlined text-white/30 text-3xl">add_circle</span>
                            <span className="text-white/30 text-xs font-bold uppercase">Создать свой</span>
                        </button>
                    </div>
                </>
            )}

            {/* PLAY MODE */}
            {(view === 'play_init' || view === 'play_partner') && currentQuiz && (
                <div className="flex flex-col h-[600px]">
                    <div className="flex-1 flex flex-col justify-center gap-6">
                        <div className="text-center">
                            <span className="text-xs font-bold text-white/30 uppercase tracking-widest">
                                {view === 'play_init' ? 'Отвечайте честно' : `Как ответил(а) ${currentAttempt?.initiator?.first_name}?`}
                            </span>
                            <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mt-2 mb-4 overflow-hidden">
                                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${((step + 1) / currentQuiz.questions.length) * 100}%` }}></div>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-white mt-2 px-2">
                                {currentQuiz.questions[step].question}
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {currentQuiz.questions[step].options.map((option, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswer(idx)}
                                    className="p-4 rounded-xl border border-white/10 font-medium text-left transition-all bg-surface-dark text-white/80 hover:bg-white/10 active:scale-[0.98]"
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button onClick={() => setView('list')} className="w-full py-4 text-white/30 text-xs font-bold">
                        ПРЕРВАТЬ
                    </button>
                </div>
            )}

            {/* RESULT MODE */}
            {view === 'result' && currentAttempt && (
                <div className="flex flex-col gap-4">
                    <div className="bg-surface-dark p-6 rounded-3xl border border-white/10 text-center">
                        <span className="text-6xl mb-2 block">🔮</span>
                        <h2 className="text-2xl font-bold text-white mb-2">Анализ Совместимости</h2>
                        <p className="text-white/50 text-sm">Подождите, ИИ психолог анализирует ваши ответы...</p>
                    </div>

                    {!aiResult ? (
                        <button
                            onClick={() => runAiAnalysis(currentAttempt)}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white font-bold shadow-lg shadow-purple-500/30 animate-pulse"
                        >
                            Запустить Анализ (AI)
                        </button>
                    ) : (
                        <div className="flex flex-col gap-4 animate-fade-in">
                            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-5 rounded-2xl">
                                <h3 className="font-bold text-indigo-300 mb-2 text-lg">Вердикт Психолога</h3>
                                <p className="text-white/90 leading-relaxed text-sm whitespace-pre-wrap">
                                    {aiResult.detailed_analysis}
                                </p>
                            </div>
                            <div className="p-4 bg-white/5 rounded-xl">
                                <h4 className="font-bold text-white/50 text-xs uppercase mb-2">Резюме</h4>
                                <p className="text-white text-sm">{aiResult.summary}</p>
                            </div>
                        </div>
                    )}

                    <button onClick={() => setView('list')} className="mt-4 w-full py-3 bg-white/10 rounded-xl text-white font-bold">
                        Назад к играм
                    </button>
                </div>
            )}

            {view === 'ai_processing' && (
                <div className="flex flex-col items-center justify-center h-[400px]">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-white font-bold">ИИ думает...</p>
                </div>
            )}

            {/* SUCCESS VIEW */}
            {view === 'success' && successMsg && (
                <div className="flex flex-col items-center justify-center text-center h-[400px] animate-fade-in px-6">
                    <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6 border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                        <span className="material-symbols-outlined text-green-500 text-4xl">{successMsg.icon}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">{successMsg.title}</h2>
                    <p className="text-white/60 leading-relaxed mb-8">{successMsg.sub}</p>

                    <div className="flex flex-col gap-3 w-full max-w-xs">
                        {successMsg.title === "Готово!" && currentAttempt && (
                            <button
                                onClick={() => viewResult(currentAttempt)}
                                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white font-bold shadow-lg active:scale-95 transition-transform"
                            >
                                Узнать Результат
                            </button>
                        )}
                        <button
                            onClick={() => {
                                setView('list');
                                fetchAttempts();
                            }}
                            className={clsx(
                                "w-full py-3 rounded-xl font-bold transition-transform",
                                successMsg.title === "Готово!" ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-black hover:scale-105"
                            )}
                        >
                            {successMsg.title === "Готово!" ? "В меню" : "Понятно"}
                        </button>
                    </div>
                </div>
            )}
            {view === 'create' && (
                <div className="flex flex-col gap-4 h-full">
                    <h2 className="text-xl font-bold text-white">Создание Квиза</h2>
                    <input
                        value={customTitle} onChange={e => setCustomTitle(e.target.value)}
                        placeholder="Название квиза"
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold"
                    />

                    <div className="flex-1 overflow-y-auto max-h-[400px] flex flex-col gap-6">
                        {customQuestions.map((q, qIdx) => (
                            <div key={qIdx} className="p-4 bg-white/5 rounded-xl border border-white/5">
                                <input
                                    value={q.question}
                                    onChange={e => updateCustomQuestion(qIdx, 'question', e.target.value)}
                                    placeholder={`Вопрос ${qIdx + 1}`}
                                    className="w-full bg-transparent border-b border-white/10 py-2 text-white font-bold mb-3 focus:border-primary outline-none"
                                />
                                <div className="grid grid-cols-1 gap-2">
                                    {q.options.map((opt, oIdx) => (
                                        <input
                                            key={oIdx}
                                            value={opt}
                                            onChange={e => updateCustomOption(qIdx, oIdx, e.target.value)}
                                            placeholder={`Ответ ${oIdx + 1}`}
                                            className="w-full bg-black/20 rounded-lg px-3 py-2 text-sm text-white/80 border border-transparent focus:border-white/30 outline-none"
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                        <button onClick={addCustomQuestion} className="py-3 border-2 border-dashed border-white/10 rounded-xl text-white/30 font-bold hover:bg-white/5">
                            + Добавить вопрос
                        </button>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button onClick={() => setView('list')} className="flex-1 py-3 bg-white/5 rounded-xl text-white font-bold">Отмена</button>
                        <button onClick={saveCustomQuiz} className="flex-1 py-3 bg-green-600 rounded-xl text-white font-bold shadow-lg shadow-green-600/20">Сохранить</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizzesList;
