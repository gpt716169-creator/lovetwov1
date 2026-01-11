import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Hand, Smile, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTelegramAuth } from '../auth/TelegramAuth';

const ACTIONS = [
    { id: 'kiss', label: 'Kiss', icon: Heart, color: 'bg-pink-500' },
    { id: 'hug', label: 'Hug', icon: Hand, color: 'bg-purple-500' },
    { id: 'pinch', label: 'Pinch', icon: Zap, color: 'bg-yellow-500' },
    { id: 'miss', label: 'Miss', icon: Smile, color: 'bg-blue-500' },
];

const ImpulseButton = () => {
    const { profile } = useTelegramAuth();
    const [lastAction, setLastAction] = useState(null);
    const [hearts, setHearts] = useState([]);

    useEffect(() => {
        // Subscribe to impulses
        const channel = supabase.channel('room1')
            .on('broadcast', { event: 'impulse' }, ({ payload }) => {
                if (payload.from !== profile?.id) {
                    spawnHearts(payload.action); // Show received effect
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile]);

    const spawnHearts = (actionId) => {
        const action = ACTIONS.find(a => a.id === actionId);
        if (!action) return;

        const newHearts = Array.from({ length: 15 }).map((_, i) => ({
            id: Date.now() + i,
            x: Math.random() * window.innerWidth,
            y: window.innerHeight,
            color: action.color.replace('bg-', 'text-')
        }));

        setHearts(prev => [...prev, ...newHearts]);

        setTimeout(() => {
            setHearts(prev => prev.filter(h => !newHearts.find(n => n.id === h.id)));
        }, 3000);
    };

    const handlePulse = async (action) => {
        setLastAction(action);
        spawnHearts(action.id);

        await supabase.channel('room1').send({
            type: 'broadcast',
            event: 'impulse',
            payload: { action: action.id, from: profile?.id },
        });

        setTimeout(() => setLastAction(null), 500);
    };

    return (
        <>
            {/* Flying Hearts Overlay */}
            {hearts.length > 0 && (
                <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                    {hearts.map(h => (
                        <motion.div
                            key={h.id}
                            initial={{ y: h.y, x: h.x, opacity: 1, scale: 0.5 }}
                            animate={{ y: -100, opacity: 0, scale: 1.5 }}
                            transition={{ duration: 2, ease: "easeOut" }}
                            className={`absolute ${h.color}`}
                        >
                            <Heart fill="currentColor" size={32} />
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Compact Grid */}
            <div className="grid grid-cols-2 gap-2 h-full">
                {ACTIONS.map((action) => (
                    <motion.button
                        key={action.id}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handlePulse(action)}
                        className={`relative h-full min-h-[60px] rounded-xl ${action.color}/10 border border-${action.color}/20 flex flex-col items-center justify-center gap-1 overflow-hidden group`}
                    >
                        <div className={`p-1.5 rounded-full ${action.color}/20 text-${action.color} group-hover:scale-110 transition-transform`}>
                            <action.icon size={16} className={`text-${action.color.replace('bg-', '')}`} />
                        </div>
                        <span className="text-[9px] font-bold text-neutral-300 uppercase">{action.label}</span>

                        {lastAction?.id === action.id && (
                            <motion.div
                                layoutId="ripple"
                                initial={{ scale: 0, opacity: 0.5 }}
                                animate={{ scale: 4, opacity: 0 }}
                                transition={{ duration: 0.5 }}
                                className={`absolute inset-0 rounded-full ${action.color} z-0`}
                            />
                        )}
                    </motion.button>
                ))}
            </div>
        </>
    );
};

export default ImpulseButton;
