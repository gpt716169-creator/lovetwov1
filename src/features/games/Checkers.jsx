import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTelegramAuth } from '../auth/TelegramAuth';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

// --- CONSTANTS ---
const BOARD_SIZE = 8;

// --- HELPER FUNCTIONS ---
const createInitialBoard = () => {
    // 8x8 Board. 
    // 0 = empty
    // 1 = Player 1 Man (White/Red) - Moving DOWN (index increases) ? No, standard is Bottom Player moves UP (index decreases).
    // Let's standardise: 
    // Player 1 (Creator) is at BOTTOM (Rows 5,6,7). Moves UP (RowIndex decreases).
    // Player 2 (Joiner) is at TOP (Rows 0,1,2). Moves DOWN (RowIndex increases).

    // We store as numbers:
    // 1 = P1 Man, 11 = P1 King
    // 2 = P2 Man, 22 = P2 King

    const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if ((r + c) % 2 === 1) { // Dark squares only
                if (r < 3) board[r][c] = 2; // Player 2 (Top)
                if (r > 4) board[r][c] = 1; // Player 1 (Bottom)
            }
        }
    }
    return board;
};

const isValidMove = (board, fromR, fromC, toR, toC, player, isKing) => {
    // Basic bounds
    if (toR < 0 || toR >= BOARD_SIZE || toC < 0 || toC >= BOARD_SIZE) return false;
    if (board[toR][toC] !== 0) return false; // Target must be empty

    const dr = toR - fromR;
    const dc = toC - fromC;
    const absDr = Math.abs(dr);
    const absDc = Math.abs(dc);

    // Simple move (1 step)
    if (absDr === 1 && absDc === 1) {
        // Man direction check
        if (!isKing) {
            if (player === 1 && dr > 0) return false; // P1 moves UP (dr < 0)
            if (player === 2 && dr < 0) return false; // P2 moves DOWN (dr > 0)
        }
        return true;
    }

    return false;
};

// Returns removed piece coords if valid capture, else null
const getCapture = (board, fromR, fromC, toR, toC, player, isKing) => {
    if (toR < 0 || toR >= BOARD_SIZE || toC < 0 || toC >= BOARD_SIZE) return null;
    if (board[toR][toC] !== 0) return null;

    const dr = toR - fromR;
    const dc = toC - fromC;

    if (Math.abs(dr) === 2 && Math.abs(dc) === 2) {
        const midR = fromR + dr / 2;
        const midC = fromC + dc / 2;
        const victim = board[midR][midC];

        if (victim === 0) return null;

        // Can only capture enemies
        const isEnemy = player === 1 ? (victim === 2 || victim === 22) : (victim === 1 || victim === 11);
        if (!isEnemy) return null;

        // Direction check for Men
        if (!isKing) {
            // Standard rules allow capturing BACKWARDS too usually? 
            // International Checkers: yes. Russian: yes. English: usually no?
            // Let's implement RUSSIAN checkers rules (simplest for audience): Men can beat backwards.
            // So no direction check for capture.
        }

        return { r: midR, c: midC };
    }
    return null;
};

const checkWin = (board, player) => {
    // Check if opponent has pieces
    const enemyMan = player === 1 ? 2 : 1;
    const enemyKing = player === 1 ? 22 : 11;

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === enemyMan || board[r][c] === enemyKing) return false;
        }
    }
    return true;
};

const Checkers = ({ gameId, onClose }) => {
    const { profile } = useTelegramAuth();
    const [game, setGame] = useState(null);
    const [selected, setSelected] = useState(null); // {r, c}
    const [validMoves, setValidMoves] = useState([]); // Array of {r,c}
    const [isDevMode, setIsDevMode] = useState(false); // FOR TESTING

    useEffect(() => {
        if (gameId) fetchGame();

        const channel = supabase.channel(`checkers_${gameId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
                (payload) => setGame(payload.new)
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [gameId]);

    const fetchGame = async () => {
        const { data } = await supabase.from('games').select('*').eq('id', gameId).single();
        setGame(data);
    };

    const handleCellClick = async (r, c) => {
        if (!game || game.status !== 'active') return;

        console.log('Checkers Click:', r, c, 'Turn:', game.current_turn, 'Me:', profile.id, 'Dev:', isDevMode);

        const board = game.game_state.board;
        const piece = board[r][c];

        // Determine my piece ID based on who is playing
        const actingPlayer = game.current_turn === game.player1_id ? 1 : 2;

        // In Self-Play or Dev Mode, allow selecting pieces of the current turn player
        const isSelfPlay = game.player1_id === game.player2_id;
        const canAct = isDevMode || isSelfPlay || (game.current_turn === profile.id);

        if (!canAct) return;

        const isMyPiece = piece === actingPlayer || piece === actingPlayer * 11; // 1 or 11 / 2 or 22

        if (isMyPiece) {
            // Select Piece
            setSelected({ r, c });
            calculateMoves(r, c, piece, board, actingPlayer);
        } else if (selected) {
            // Attempt Move
            const move = validMoves.find(m => m.r === r && m.c === c);
            if (move) {
                executeMove(move, actingPlayer);
            } else {
                setSelected(null);
                setValidMoves([]);
            }
        }
    };

    const calculateMoves = (r, c, piece, board, player) => {
        const moves = [];
        const isKing = piece > 2;

        // Check 4 diagonals
        const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

        dirs.forEach(([dr, dc]) => {
            // Try Step
            if (isValidMove(board, r, c, r + dr, c + dc, player, isKing)) {
                moves.push({ r: r + dr, c: c + dc, type: 'step' });
            }
            // Try Capture
            const cap = getCapture(board, r, c, r + dr * 2, c + dc * 2, player, isKing);
            if (cap) {
                moves.push({ r: r + dr * 2, c: c + dc * 2, type: 'capture', captured: cap });
            }
        });
        setValidMoves(moves);
    };

    const executeMove = async (move, player) => {
        const board = game.game_state.board.map(row => [...row]); // Deep copy
        const fromR = selected.r;
        const fromC = selected.c;
        const piece = board[fromR][fromC];

        // Move
        board[move.r][move.c] = piece;
        board[fromR][fromC] = 0;

        // Capture
        if (move.type === 'capture') {
            board[move.captured.r][move.captured.c] = 0;
        }

        // King Promotion
        const isKing = piece > 2;
        if (!isKing) {
            if (player === 1 && move.r === 0) board[move.r][move.c] = 11;
            if (player === 2 && move.r === BOARD_SIZE - 1) board[move.r][move.c] = 22;
        }

        // Win Check
        let winner = null;
        let status = 'active';
        if (checkWin(board, player)) {
            winner = game.current_turn; // The acting player won
            status = 'completed';
        }

        // Turn Management
        let nextTurn = game.current_turn === game.player1_id ? game.player2_id : game.player1_id;

        // 1. OPTIMISTIC UPDATE (Instant Feedback)
        setGame(prev => ({
            ...prev,
            game_state: { board },
            current_turn: nextTurn,
            winner_id: winner,
            status: status
        }));
        setSelected(null);
        setValidMoves([]);

        // 2. Database Update
        const { error } = await supabase.from('games').update({
            game_state: { board },
            current_turn: nextTurn,
            winner_id: winner,
            status: status,
            updated_at: new Date()
        }).eq('id', gameId);

        if (error) {
            console.error('Checkers Update Error:', error);
            alert('Ошибка хода: ' + error.message);
        }
    };

    // --- RENDER ---
    if (!game) return <div className="text-center text-white p-10">Загрузка...</div>;

    const board = game.game_state.board;
    const isPlayer1 = game.player1_id === profile.id;
    // We rotate the board for Player 2 so they play from bottom
    // Actually, simple CSS rotation is easier.

    // Player 1 (Red/White) moves UP. Player 2 (Black/Blue) moves DOWN.
    // If I am Player 2, I want to see board rotated 180deg so my pieces are at bottom moving up visually.

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] overflow-y-auto pb-10">
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex justify-between items-center sticky top-0 bg-[#1e1e1e]/95 z-20 backdrop-blur-md">
                <h3 className="text-white font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-500">apps</span>
                    Шашки
                </h3>
                <div className="flex gap-2">
                    <button onClick={() => setIsDevMode(!isDevMode)} className={clsx("text-[10px] px-2 py-1 rounded border", isDevMode ? "bg-red-500 text-white border-red-500" : "border-white/10 text-white/30")}>
                        TEST
                    </button>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-4">

                {/* Status Bar */}
                <div className={clsx("mb-6 px-4 py-2 rounded-full font-bold text-sm transition-all",
                    game.current_turn === profile.id ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "bg-white/10 text-white/50"
                )}>
                    {game.status === 'completed' ? (
                        game.winner_id === profile.id ? "Победа! 🏆" : "Поражение 🏳️"
                    ) : (
                        game.current_turn === profile.id ? "Ваш ход" : "Ход партнера"
                    )}
                </div>

                {/* Board */}
                <div className={clsx("grid grid-cols-8 gap-0 border-8 border-[#3d2e1e] rounded-lg shadow-2xl relative",
                    !isPlayer1 && "" // "rotate-180" if we want to flip, but labels might get mirrored.
                )}>
                    {board.map((row, r) =>
                        row.map((cell, c) => {
                            const isDark = (r + c) % 2 === 1;
                            const isSelected = selected?.r === r && selected?.c === c;
                            const isValidMove = validMoves.some(m => m.r === r && m.c === c);

                            // Visual Rotation for Player 2
                            // If !isPlayer1, we map r -> 7-r, c -> 7-c ?
                            // No, let's keep it simple: Player 1 (Red) starts at Bottom 5-7.
                            // Player 2 (Blue) starts at Top 0-2.
                            // Ideally we rotate board view CSS if !isPlayer1.

                            return (
                                <div
                                    key={`${r}-${c}`}
                                    onClick={() => handleCellClick(r, c)}
                                    className={clsx(
                                        "w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center relative",
                                        isDark ? "bg-[#765c48]" : "bg-[#e8c39e]",
                                        isValidMove && "after:content-[''] after:absolute after:w-4 after:h-4 after:bg-green-500/50 after:rounded-full cursor-pointer hover:bg-[#6b523f]"
                                    )}
                                >
                                    {/* Piece */}
                                    {cell !== 0 && (
                                        <motion.div
                                            layoutId={`piece-${r}-${c}`}
                                            className={clsx(
                                                "w-[80%] h-[80%] rounded-full shadow-lg border-2 flex items-center justify-center relative z-10",
                                                (cell === 1 || cell === 11) ? "bg-red-500 border-red-700" : "bg-slate-800 border-slate-950",
                                                isSelected && "ring-2 ring-white scale-110"
                                            )}
                                        >
                                            {/* King Crown */}
                                            {(cell === 11 || cell === 22) && (
                                                <span className="material-symbols-outlined text-white/80 text-[18px]">crown</span>
                                            )}
                                        </motion.div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

            </div>
        </div>
    );
};

export const createCheckersGame = async (profile) => {
    const p2 = profile.partner_id || profile.id; // Fallback to self for testing

    const { data } = await supabase.from('games').insert({
        type: 'checkers',
        player1_id: profile.id,
        player2_id: p2,
        current_turn: profile.id, // Player 1 starts
        status: 'active',
        game_state: {
            board: createInitialBoard()
        }
    }).select().single();
    return data;
};

export default Checkers;
