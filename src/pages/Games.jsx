import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { supabase } from '../lib/supabase';
import { useTelegramAuth } from '../features/auth/TelegramAuth';
import ConflictManager from '../features/games/ConflictManager';
import TicTacToe, { createTicTacToe } from '../features/games/TicTacToe';
import Battleship, { createBattleshipGame } from '../features/games/Battleship';
import Checkers, { createCheckersGame } from '../features/games/Checkers';
import QuizzesList from '../features/games/QuizzesList';

const Games = () => {
    const { profile } = useTelegramAuth();
    const [activeTab, setActiveTab] = useState('play'); // 'play', 'quizzes', 'tests'
    const [showMediator, setShowMediator] = useState(false);

    // Games State
    const [activeGames, setActiveGames] = useState([]);
    const [selectedGameId, setSelectedGameId] = useState(null);
    const [selectedGameType, setSelectedGameType] = useState(null);

    useEffect(() => {
        if (profile?.id) fetchActiveGames();

        const channel = supabase.channel('games_list')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, (payload) => {
                // Optimistic Update for Insert
                if (payload.eventType === 'INSERT') {
                    // Check if not already there (to avoid dupe if we added manually)
                    setActiveGames(prev => {
                        if (prev.find(g => g.id === payload.new.id)) return prev;
                        return [payload.new, ...prev];
                    });
                } else {
                    fetchActiveGames();
                }
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [profile]);

    const fetchActiveGames = async () => {
        if (!profile?.id) return;
        const { data } = await supabase.from('games')
            .select('*')
            .or(`player1_id.eq.${profile.id},player2_id.eq.${profile.id}`)
            .order('updated_at', { ascending: false });
        setActiveGames(data || []);
    };

    const handleOpenGame = (game) => {
        setSelectedGameType(game.type);
        setSelectedGameId(game.id);
    };

    const handleCloseGame = () => {
        setSelectedGameId(null);
        setSelectedGameType(null);
        fetchActiveGames();
    };

    const handleDeleteGame = async (e, gameId) => {
        e.stopPropagation();
        if (!window.confirm("Удалить этот матч?")) return;

        // Optimistic Remove
        setActiveGames(prev => prev.filter(g => g.id !== gameId));

        await supabase.from('games').delete().eq('id', gameId);
    };

    const handleNewTicTacToe = async () => {
        const newGame = await createTicTacToe(profile);
        if (newGame) {
            setActiveGames(prev => [newGame, ...prev]);
            handleOpenGame(newGame);
        }
    };

    const handleNewBattleship = async () => {
        const newGame = await createBattleshipGame(profile);
        if (newGame) {
            setActiveGames(prev => [newGame, ...prev]);
            handleOpenGame(newGame);
        }
    };

    const handleNewCheckers = async () => {
        const newGame = await createCheckersGame(profile);
        if (newGame) {
            setActiveGames(prev => [newGame, ...prev]);
            handleOpenGame(newGame);
        }
    };

    // Helper to render correct game component
    const renderActiveGame = () => {
        // Use explicit type if available, fallback to finding in list
        let type = selectedGameType;
        if (!type && selectedGameId) {
            const game = activeGames.find(g => g.id === selectedGameId);
            if (game) type = game.type;
        }

        if (type === 'battleship') return <Battleship gameId={selectedGameId} onClose={handleCloseGame} />;
        if (type === 'checkers') return <Checkers gameId={selectedGameId} onClose={handleCloseGame} />;
        if (type === 'tictactoe') return <TicTacToe gameId={selectedGameId} onClose={handleCloseGame} />;

        return (
            <div className="flex flex-col items-center justify-center h-full text-white animate-fade-in">
                <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4"></div>
                <p>Загрузка игры...</p>
                <button onClick={handleCloseGame} className="mt-4 text-sm underline opacity-50">Отмена</button>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-background-light dark:bg-background-dark min-h-screen pb-24">
            {/* Header */}
            <header className="flex items-center justify-between px-5 py-4 z-20 sticky top-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-xl border-b border-white/5">
                <h2 className="text-2xl font-extrabold leading-tight tracking-tight dark:text-white">Игровая <span className="text-green-500 text-xs align-top">v2.0</span></h2>
                <div className="w-8"></div>
            </header>

            {/* Tabs */}
            <div className="px-5 mt-4 mb-6">
                <div className="flex p-1 bg-surface-dark rounded-xl border border-white/5">
                    {['play', 'quizzes', 'tests'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={clsx(
                                "flex-1 py-2.5 rounded-lg text-sm font-bold transition-all capitalize",
                                activeTab === tab ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white"
                            )}
                        >
                            {tab === 'play' ? 'Игры' : tab === 'quizzes' ? 'Квизы' : 'Тесты'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <main className="flex-1 px-5 overflow-y-auto no-scrollbar pb-10">

                {activeTab === 'play' && (
                    <div className="flex flex-col gap-6 animate-fade-in">

                        {/* Active Games List */}
                        {activeGames.length > 0 && !selectedGameId && (
                            <div className="flex flex-col gap-3">
                                <h3 className="text-white/50 text-xs font-bold uppercase tracking-wider pl-1">Активные матчи</h3>
                                {activeGames.map(game => (
                                    <div
                                        key={game.id}
                                        onClick={() => handleOpenGame(game)}
                                        className="w-full bg-surface-dark border border-white/10 rounded-xl p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={clsx("w-2 h-2 rounded-full", game.current_turn === profile.id ? "bg-green-500 animate-pulse" : "bg-white/20")}></div>
                                            <div className="text-left">
                                                <div className="text-white font-bold text-sm">
                                                    {game.type === 'tictactoe' && 'Крестики-Нолики'}
                                                    {game.type === 'battleship' && 'Морской Бой'}
                                                    {game.type === 'checkers' && 'Шашки'}
                                                </div>
                                                <div className="text-white/40 text-[10px]">
                                                    {game.updated_at ? new Date(game.updated_at).toLocaleTimeString() : 'New'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => handleDeleteGame(e, game.id)}
                                                className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 active:scale-90 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                            <span className="material-symbols-outlined text-white/30">chevron_right</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Game Launcher Grid */}
                        {!selectedGameId && (
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={handleNewTicTacToe}
                                    className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 h-32 flex flex-col justify-between shadow-lg active:scale-95 transition-transform relative overflow-hidden"
                                >
                                    <span className="material-symbols-outlined text-white text-3xl z-10 w-fit">grid_on</span>
                                    <span className="text-white font-bold text-left z-10">Крестики-<br />Нолики</span>
                                    <span className="absolute -right-4 -bottom-4 text-white/10 text-9xl material-symbols-outlined">grid_on</span>
                                </button>

                                <button
                                    onClick={handleNewBattleship}
                                    className="bg-gradient-to-br from-cyan-600 to-blue-800 rounded-2xl p-4 h-32 flex flex-col justify-between shadow-lg active:scale-95 transition-transform overflow-hidden relative"
                                >
                                    <span className="material-symbols-outlined text-white text-3xl z-10 w-fit">directions_boat</span>
                                    <span className="text-white font-bold text-left z-10 leading-tight">Морской<br />Бой</span>
                                    <span className="absolute -right-4 -bottom-4 text-white/10 text-9xl material-symbols-outlined">directions_boat</span>
                                </button>

                                <button
                                    onClick={handleNewCheckers}
                                    className="col-span-2 bg-gradient-to-br from-amber-600 to-orange-800 rounded-2xl p-4 h-24 flex items-center justify-between shadow-lg active:scale-95 transition-transform overflow-hidden relative"
                                >
                                    <div className="flex flex-col z-10">
                                        <span className="text-white font-bold text-lg">Шашки</span>
                                        <span className="text-white/60 text-xs">Классика в новом дизайне</span>
                                    </div>
                                    <span className="material-symbols-outlined text-white text-4xl z-10">apps</span>
                                    <span className="absolute right-10 -bottom-10 text-white/10 text-9xl material-symbols-outlined">apps</span>
                                </button>
                            </div>
                        )}

                        {/* ACTIVE GAME RENDER */}
                        {selectedGameId && (
                            <div className="fixed inset-0 z-50 bg-black animate-fade-in">
                                {renderActiveGame()}
                            </div>
                        )}

                        {/* Relationship Tools Section */}
                        {!selectedGameId && (
                            <div className="mt-8 flex flex-col gap-3 animate-fade-in">
                                <h3 className="text-white/50 text-xs font-bold uppercase tracking-wider pl-1">Отношения & Психология</h3>

                                <button
                                    onClick={() => setShowMediator(true)}
                                    className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl p-5 flex items-center justify-between shadow-lg shadow-violet-500/20 active:scale-[0.98] transition-all relative overflow-hidden group"
                                >
                                    <div className="flex flex-col text-left z-10 relative">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="material-symbols-outlined text-white text-2xl">psychology</span>
                                            <h4 className="text-white font-bold text-lg">AI Медиатор</h4>
                                        </div>
                                        <p className="text-white/80 text-xs max-w-[200px] leading-relaxed">
                                            Возникло недопонимание? ИИ психолог поможет найти компромисс.
                                        </p>
                                    </div>

                                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center z-10 backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                                        <span className="material-symbols-outlined text-white">arrow_forward</span>
                                    </div>

                                    {/* Decorative Background Icons */}
                                    <span className="absolute -right-4 -bottom-6 text-white/10 text-9xl material-symbols-outlined rotate-12">handshake</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'quizzes' && (
                    <QuizzesList />
                )}

                {activeTab === 'tests' && (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                        <span className="material-symbols-outlined text-6xl mb-4">psychology_alt</span>
                        <p className="text-sm">Психологические тесты и<br />ИИ анализ совместимости<br />уже в разработке!</p>
                    </div>
                )}

            </main>

            {/* Modals */}
            {showMediator && <ConflictManager onClose={() => setShowMediator(false)} />}
        </div>
    );
};

export default Games;
