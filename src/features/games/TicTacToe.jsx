import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTelegramAuth } from '../auth/TelegramAuth';
import clsx from 'clsx';
import { motion } from 'framer-motion';

const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

const TicTacToe = ({ gameId, onClose }) => {
    const { profile } = useTelegramAuth();
    const [game, setGame] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (gameId) fetchGame();

        const channel = supabase.channel(`game_${gameId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
                (payload) => setGame(payload.new)
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [gameId]);

    const fetchGame = async () => {
        const { data } = await supabase.from('games').select('*').eq('id', gameId).single();
        setGame(data);
        setLoading(false);
    };

    const handleMove = async (index) => {
        if (!game || game.status !== 'active') return;
        if (game.current_turn !== profile.id) return;

        const board = game.game_state?.board || Array(9).fill(null);
        if (board[index]) return;

        // Determine symbol based on whose turn it is (supports self-play)
        const symbol = game.current_turn === game.player1_id ? 'X' : 'O';

        const newBoard = [...board];
        newBoard[index] = symbol;

        // Check Win
        let winner = null;
        let status = 'active';

        for (let line of WIN_LINES) {
            const [a, b, c] = line;
            if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
                winner = profile.id;
                status = 'completed';
                break;
            }
        }

        if (!winner && newBoard.every(cell => cell)) {
            status = 'completed'; // Draw
        }

        const nextTurn = status === 'active'
            ? (game.current_turn === game.player1_id ? game.player2_id : game.player1_id)
            : null;

        // OPTIMISTIC UPDATE
        setGame(prev => ({
            ...prev,
            game_state: { board: newBoard },
            current_turn: nextTurn,
            winner_id: winner,
            status: status
        }));

        const { error } = await supabase.from('games').update({
            game_state: { board: newBoard },
            current_turn: nextTurn,
            winner_id: winner,
            status: status,
            updated_at: new Date()
        }).eq('id', gameId);

        if (error) {
            alert('Ошибка хода: ' + error.message);
        }
    };

    const isMyTurn = game?.current_turn === profile?.id;
    const board = game?.game_state?.board || Array(9).fill(null);

    if (loading) return <div className="p-10 text-center text-white">Загрузка игры...</div>;

    return (
        <div className="flex flex-col items-center h-full">
            {/* Header / Status */}
            {/* Header */}
            <div className="w-full p-4 flex justify-between items-center bg-white/5 rounded-2xl mb-6 backdrop-blur-md border border-white/5">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-400">grid_on</span>
                </h3>

                {/* Status Badge */}
                {game.status === 'active' ? (
                    <div className={clsx("px-3 py-1 rounded-full font-bold text-xs transition-all",
                        isMyTurn ? "bg-green-500 text-white shadow-lg shadow-green-500/30" : "bg-white/10 text-white/50"
                    )}>
                        {isMyTurn ? "Ваш ход" : "Ждем..."}
                    </div>
                ) : (
                    <div className="px-3 py-1 rounded-full font-bold text-xs bg-amber-400 text-black shadow-lg">
                        {game.winner_id === profile.id ? "Победа!" : "Конец"}
                    </div>
                )}

                <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:bg-white/20 hover:text-white transition-all">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            {/* Board */}
            <div className="grid grid-cols-3 gap-3 bg-white/5 p-4 rounded-3xl backdrop-blur-sm shadow-2xl">
                {board.map((cell, i) => (
                    <button
                        key={i}
                        onClick={() => handleMove(i)}
                        disabled={!!cell || !isMyTurn || game.status !== 'active'}
                        className={clsx(
                            "w-20 h-20 rounded-xl flex items-center justify-center text-4xl font-black transition-all",
                            cell === 'X' ? "bg-indigo-500/20 text-indigo-400" :
                                cell === 'O' ? "bg-pink-500/20 text-pink-400" :
                                    "bg-white/5 hover:bg-white/10"
                        )}
                    >
                        {userIsX(game, profile.id) && !cell && isMyTurn ? (
                            <span className="opacity-0 hover:opacity-20 text-white text-2xl">X</span>
                        ) : null}

                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: cell ? 1 : 0 }}
                            transition={{ type: "spring" }}
                        >
                            {cell}
                        </motion.span>
                    </button>
                ))}
            </div>

            {/* Footer */}
            <div className="mt-auto pt-6 w-full flex justify-center">
                <button onClick={onClose} className="text-white/30 text-xs font-bold uppercase tracking-wider hover:text-white transition-colors">
                    Закрыть игру
                </button>
            </div>
        </div>
    );
};

const userIsX = (game, userId) => game.player1_id === userId;

/* Helper to Create New Game */
export const createTicTacToe = async (profile) => {
    const p2 = profile.partner_id || profile.id; // Fallback to self for testing

    const { data, error } = await supabase.from('games').insert({
        type: 'tictactoe',
        player1_id: profile.id,
        player2_id: p2,
        current_turn: profile.id, // Creator starts
        game_state: { board: Array(9).fill(null) }
    }).select().single();

    if (error) alert(error.message);
    return data;
};

export default TicTacToe;
