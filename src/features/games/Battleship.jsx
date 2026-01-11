import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTelegramAuth } from '../auth/TelegramAuth';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

// --- CONSTANTS ---
const BOARD_SIZE = 10;
const SHIPS_CONFIG = [
    { size: 4, count: 1, name: "Линкор" },
    { size: 3, count: 2, name: "Крейсер" },
    { size: 2, count: 3, name: "Эсминец" },
    { size: 1, count: 4, name: "Катер" }
];

// --- HELPER FUNCTIONS ---
const createEmptyBoard = () => Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));

// Check if ship placement is valid (including 1-cell padding buffer)
const isValidPlacement = (board, row, col, size, vertical) => {
    // Check bounds
    if (vertical) {
        if (row + size > BOARD_SIZE) return false;
    } else {
        if (col + size > BOARD_SIZE) return false;
    }

    // Check collision and padding
    for (let i = 0; i < size; i++) {
        const r = vertical ? row + i : row;
        const c = vertical ? col : col + i;

        // Check the cell itself and neighbors
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                    if (board[nr][nc] !== null) return false;
                }
            }
        }
    }
    return true;
};

const placeShip = (board, row, col, size, vertical) => {
    const newBoard = board.map(row => [...row]);
    const shipId = Math.random().toString(36).substr(2, 9);
    for (let i = 0; i < size; i++) {
        const r = vertical ? row + i : row;
        const c = vertical ? col : col + i;
        newBoard[r][c] = { id: shipId, size, hit: false };
    }
    return newBoard;
};

// --- COMPONENT ---
// --- COMPONENT ---
const Battleship = ({ gameId, onClose }) => {
    const { profile } = useTelegramAuth();
    const [game, setGame] = useState(null);
    const [myBoard, setMyBoard] = useState(createEmptyBoard()); // Local state for placement
    // Deep copy to prevent mutation of constant
    const [placementQueue, setPlacementQueue] = useState(JSON.parse(JSON.stringify(SHIPS_CONFIG)));
    const [vertical, setVertical] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isDevMode, setIsDevMode] = useState(false); // TEST MODE

    // Helper: Random Board Generator
    const generateRandomBoard = () => {
        let board = createEmptyBoard();
        for (let ship of SHIPS_CONFIG) {
            for (let i = 0; i < ship.count; i++) {
                let placed = false;
                let attempts = 0;
                while (!placed && attempts < 100) {
                    const r = Math.floor(Math.random() * BOARD_SIZE);
                    const c = Math.floor(Math.random() * BOARD_SIZE);
                    const v = Math.random() > 0.5;
                    if (isValidPlacement(board, r, c, ship.size, v)) {
                        board = placeShip(board, r, c, ship.size, v);
                        placed = true;
                    }
                    attempts++;
                }
            }
        }
        return board;
    };

    useEffect(() => {
        if (gameId) fetchGame();

        const channel = supabase.channel(`battleship_${gameId}`)
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

    // --- PLACEMENT PHASE ---
    const handleCellClickPlacement = (r, c) => {
        if (placementQueue.length === 0) return;

        const currentShipType = placementQueue[0];
        // Find next ship to place (decrement count)

        if (isValidPlacement(myBoard, r, c, currentShipType.size, vertical)) {
            const newBoard = placeShip(myBoard, r, c, currentShipType.size, vertical);
            setMyBoard(newBoard);

            // Update queue
            const newQueue = [...placementQueue];
            newQueue[0].count--;
            if (newQueue[0].count === 0) newQueue.shift();
            setPlacementQueue(newQueue);
        } else {
            // Vibrate or shake effect could go here
        }
    };

    const confirmPlacement = async () => {
        setSaving(true);
        const playerKey = game.player1_id === profile.id ? 'player1' : 'player2';

        const gameState = game.game_state || {};
        const newGameState = {
            ...gameState,
            [`${playerKey}_board`]: myBoard,
            [`${playerKey}_ready`]: true
        };

        const otherPlayerKey = playerKey === 'player1' ? 'player2' : 'player1';
        let status = 'setup';
        let currentTurn = game.current_turn;

        // DEV MODE or SELF-PLAY MAGIC: Auto-setup opponent
        const isSelfPlay = game.player1_id === game.player2_id;
        if ((isDevMode || isSelfPlay) && !newGameState[`${otherPlayerKey}_ready`]) {
            newGameState[`${otherPlayerKey}_board`] = generateRandomBoard();
            newGameState[`${otherPlayerKey}_ready`] = true;
        }

        if (newGameState[`${otherPlayerKey}_ready`]) {
            status = 'active';
            currentTurn = game.player1_id; // Player 1 starts
        }

        const { error: setupError } = await supabase.from('games').update({
            game_state: newGameState,
            status: status,
            current_turn: currentTurn
        }).eq('id', gameId);

        if (setupError) {
            console.error('Battleship Setup Error:', setupError);
            alert('Ошибка старта: ' + setupError.message);
        }
        setSaving(false);
    };

    const resetPlacement = () => {
        setMyBoard(createEmptyBoard());
        setPlacementQueue(JSON.parse(JSON.stringify(SHIPS_CONFIG)));
    };

    // --- BATTLE PHASE ---
    const handleFire = async (r, c) => {
        console.log('Battleship Fire:', r, c, 'Dev:', isDevMode, 'Turn:', game.current_turn);
        const isMyTurn = isDevMode ? true : (game.current_turn === profile.id);
        if (!isMyTurn || game.status !== 'active') return;

        const isPlayer1 = game.player1_id === profile.id;
        // If I am P1, I shoot at P2. If I am P2, I shoot at P1.
        // In Self-Play, I am P1. So I shoot at P2.
        const enemyKey = isPlayer1 ? 'player2' : 'player1';
        const enemyBoard = game.game_state[`${enemyKey}_board`];

        if (enemyBoard[r][c] && enemyBoard[r][c].hit === true) return; // Already shot here (miss or hit)
        if (enemyBoard[r][c] === 'miss') return;

        const newEnemyBoard = enemyBoard.map(row => [...row]);
        let hit = false;

        if (newEnemyBoard[r][c] && typeof newEnemyBoard[r][c] === 'object') {
            // HIT!
            newEnemyBoard[r][c] = { ...newEnemyBoard[r][c], hit: true };
            hit = true;
            // TODO: Check if ship sunk?
        } else {
            // MISS
            newEnemyBoard[r][c] = 'miss';
        }

        // Check Win Condition
        let winner = null;
        let status = 'active';
        if (checkWin(newEnemyBoard)) {
            winner = profile.id;
            status = 'completed';
        }

        const { error: fireError } = await supabase.from('games').update({
            game_state: {
                ...game.game_state,
                [`${enemyKey}_board`]: newEnemyBoard
            },
            current_turn: hit ? profile.id : (isPlayer1 ? game.player2_id : game.player1_id), // If hit, shoot again
            winner_id: winner,
            status: status
        }).eq('id', gameId);

        if (fireError) {
            console.error('Battleship Fire Error:', fireError);
            alert('Ошибка выстрела: ' + fireError.message);
        }
    };

    const checkWin = (board) => {
        // If all ship cells are hit
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const cell = board[r][c];
                if (cell && typeof cell === 'object' && cell.hit === false) {
                    return false; // Found unhit ship part
                }
            }
        }
        return true;
    };

    // --- RENDER HELPERS ---
    if (!game) return <div className="p-8 text-center text-white">Загрузка флота...</div>;

    const isPlayer1 = game.player1_id === profile.id;
    const myKey = isPlayer1 ? 'player1' : 'player2';
    const enemyKey = isPlayer1 ? 'player2' : 'player1';

    // Check phases
    const AM_I_READY = game.game_state?.[`${myKey}_ready`];
    const IS_PLACEMENT_PHASE = game.status === 'active' ? false : !AM_I_READY || game.status === 'setup';

    // In placement phase, show local `myBoard`
    // In battle phase, show data from DB
    const myDisplayBoard = IS_PLACEMENT_PHASE ? myBoard : (game.game_state?.[`${myKey}_board`] || createEmptyBoard());
    const enemyDisplayBoard = game.game_state?.[`${enemyKey}_board`] || createEmptyBoard();

    return (
        <div className="flex flex-col h-full bg-slate-900 overflow-y-auto pb-10">
            {/* Top Bar */}
            <div className="p-4 border-b border-white/5 flex justify-between items-center sticky top-0 bg-slate-900/95 z-20 backdrop-blur-md">
                <h3 className="text-white font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-400">directions_boat</span>
                    Морской Бой
                </h3>
                <div className="flex gap-2">
                    <button onClick={() => setIsDevMode(!isDevMode)} className={clsx("text-[10px] px-2 py-1 rounded border", isDevMode ? "bg-red-500 text-white border-red-500" : "border-white/10 text-white/30")}>
                        TEST-DEPLOY
                    </button>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col p-4 gap-6 items-center">

                {/* PLACEMENT UI */}
                {IS_PLACEMENT_PHASE && !AM_I_READY && (
                    <div className="w-full max-w-sm animate-fade-in text-center">
                        <p className="text-white/60 text-sm mb-4">Расставьте флот</p>

                        {/* Controls */}
                        <div className="flex justify-between mb-4">
                            <button onClick={() => setVertical(!vertical)} className="px-4 py-2 bg-white/10 rounded-lg text-white text-xs font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px]">rotate_right</span>
                                {vertical ? 'Вертикально' : 'Горизонтально'}
                            </button>
                            <button onClick={resetPlacement} className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg text-xs font-bold">
                                Сброс
                            </button>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-10 gap-0.5 bg-blue-900/20 border border-blue-500/30 p-1 rounded-lg aspect-square mb-4">
                            {myDisplayBoard.map((row, r) =>
                                row.map((cell, c) => (
                                    <div
                                        key={`${r}-${c}`}
                                        onClick={() => handleCellClickPlacement(r, c)}
                                        className={clsx(
                                            "w-full h-full rounded-[2px] cursor-pointer transition-colors",
                                            cell ? "bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]" : "bg-white/5 hover:bg-white/10"
                                        )}
                                    ></div>
                                ))
                            )}
                        </div>

                        {/* Queue Status */}
                        <div className="flex justify-center gap-4 mb-6">
                            {placementQueue.length > 0 ? (
                                <div className="text-white font-bold">
                                    Ставим: {placementQueue[0].name} ({placementQueue[0].size} кл.)
                                </div>
                            ) : (
                                <button
                                    onClick={confirmPlacement}
                                    disabled={saving}
                                    className="w-full py-3 bg-green-500 hover:bg-green-600 rounded-xl text-white font-bold shadow-lg shadow-green-500/20"
                                >
                                    {saving ? "Сохранение..." : "В БОЙ! 🚀"}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* WAITING FOR OPPONENT */}
                {AM_I_READY && game.status === 'setup' && (
                    <div className="flex flex-col items-center justify-center flex-1 opacity-50">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-white font-bold">Ждем пока партнер расставит корабли...</p>
                    </div>
                )}

                {/* BATTLE UI */}
                {game.status === 'active' && (
                    <div className="w-full max-w-sm flex flex-col gap-8 animate-fade-in">

                        {/* ENEMY BOARD (TARGET) */}
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-end px-2">
                                <span className={clsx("text-xs font-bold uppercase", game.current_turn === profile.id ? "text-green-400 animate-pulse" : "text-white/40")}>
                                    {game.current_turn === profile.id ? "ВАШ ХОД - ОГОНЬ!" : "Ход партнера..."}
                                </span>
                                <span className="text-[10px] text-white/30">Поле Противника</span>
                            </div>

                            <div className={clsx("grid grid-cols-10 gap-0.5 bg-red-900/10 border p-1 rounded-lg aspect-square relative",
                                game.current_turn === profile.id ? "border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.1)]" : "border-white/10 opacity-70 grayscale"
                            )}>
                                {enemyDisplayBoard.map((row, r) =>
                                    row.map((cell, c) => {
                                        let content = null;
                                        let bgClass = "bg-white/5";

                                        // We only show hits and misses! Ships are hidden unless hit.
                                        if (cell === 'miss') {
                                            bgClass = "bg-white/10";
                                            content = <div className="w-1.5 h-1.5 rounded-full bg-white/30"></div>;
                                        }
                                        else if (typeof cell === 'object' && cell !== null) {
                                            if (cell.hit) {
                                                bgClass = "bg-red-500/20";
                                                content = <span className="material-symbols-outlined text-[10px] text-red-500 font-bold">close</span>;
                                            } else {
                                                // HIDDEN SHIP - DO NOT RENDER FOR ENEMY
                                                // Dev mode cheat: bgClass = "bg-blue-500/10"; 
                                            }
                                        }

                                        return (
                                            <button
                                                key={`e-${r}-${c}`}
                                                onClick={() => handleFire(r, c)}
                                                disabled={game.current_turn !== profile.id || cell === 'miss' || (typeof cell === 'object' && cell.hit)}
                                                className={clsx(
                                                    "w-full h-full rounded-[2px] flex items-center justify-center transition-all",
                                                    bgClass,
                                                    game.current_turn === profile.id && !content ? "hover:bg-green-500/20 cursor-crosshair" : ""
                                                )}
                                            >
                                                {content}
                                            </button>
                                        );
                                    })
                                )}
                                {/* Block interaction if not my turn */}
                                {game.current_turn !== profile.id && (
                                    <div className="absolute inset-0 z-10 bg-black/10 cursor-not-allowed"></div>
                                )}
                            </div>
                        </div>

                        {/* MY BOARD (STATUS) */}
                        <div className="flex flex-col gap-2 opacity-80 scale-90 origin-top">
                            <div className="px-2">
                                <span className="text-[10px] text-white/30">Ваш Флот</span>
                            </div>
                            <div className="grid grid-cols-10 gap-0.5 bg-blue-900/10 border border-blue-500/20 p-1 rounded-lg aspect-square pointer-events-none">
                                {myDisplayBoard.map((row, r) =>
                                    row.map((cell, c) => {
                                        let content = null;
                                        let bgClass = "bg-white/5";

                                        if (cell === 'miss') {
                                            content = <div className="w-1.5 h-1.5 rounded-full bg-white/30"></div>;
                                        }
                                        else if (typeof cell === 'object' && cell !== null) {
                                            bgClass = cell.hit ? "bg-red-500" : "bg-blue-500"; // Show my ships
                                            if (cell.hit) content = <span className="material-symbols-outlined text-[10px] text-white font-bold">close</span>;
                                        }

                                        return (
                                            <div key={`m-${r}-${c}`} className={clsx("w-full h-full rounded-[2px] flex items-center justify-center", bgClass)}>
                                                {content}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                    </div>
                )}

                {/* GAME OVER */}
                {game.status === 'completed' && (
                    <div className="text-center animate-bounce-in">
                        <h2 className="text-3xl font-bold text-white mb-2">
                            {game.winner_id === profile.id ? "ПОБЕДА! 🏆" : "Поражение 💀"}
                        </h2>
                        <button onClick={onClose} className="px-6 py-2 bg-white/10 rounded-full text-white font-bold">
                            Выйти
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

// Helper to create game
export const createBattleshipGame = async (profile) => {
    const p2 = profile.partner_id || profile.id; // Fallback to self for testing

    const { data } = await supabase.from('games').insert({
        type: 'battleship',
        player1_id: profile.id,
        player2_id: p2,
        current_turn: null,
        status: 'setup',
        game_state: {
            player1_ready: false,
            player2_ready: false,
        }
    }).select().single();
    return data;
};

export default Battleship;
