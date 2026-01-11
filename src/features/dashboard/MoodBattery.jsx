import React, { useState } from 'react';
import { Battery, BatteryCharging, BatteryFull, BatteryLow, BatteryMedium, BatteryWarning } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

const MOOODS = [
    { level: 1, label: 'Danger', icon: BatteryWarning, color: 'text-red-500', bg: 'bg-red-500/20' },
    { level: 2, label: 'Low', icon: BatteryLow, color: 'text-orange-500', bg: 'bg-orange-500/20' },
    { level: 3, label: 'Tired', icon: BatteryMedium, color: 'text-yellow-500', bg: 'bg-yellow-500/20' },
    { level: 4, label: 'Okay', icon: BatteryFull, color: 'text-green-500', bg: 'bg-green-500/20' },
    { level: 5, label: 'Playful', icon: BatteryCharging, color: 'text-purple-500', bg: 'bg-purple-500/20' },
    { level: 6, label: 'Beast', icon: Battery, color: 'text-pink-500', bg: 'bg-pink-500/20' },
];

const MoodBattery = () => {
    const [currentMood, setCurrentMood] = useState(4); // Default to 'Okay'
    const [isOpen, setIsOpen] = useState(false);

    const activeMood = MOOODS.find(m => m.level === currentMood) || MOOODS[3];

    return (
        <div className="relative">
            <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "w-full p-4 rounded-2xl border border-white/10 backdrop-blur-lg flex items-center justify-between transition-colors",
                    activeMood.bg
                )}
            >
                <div className="flex items-center gap-3">
                    <activeMood.icon className={clsx("w-8 h-8", activeMood.color)} />
                    <div className="text-left">
                        <p className="text-xs text-neutral-400 uppercase tracking-wider font-bold">Current Mood</p>
                        <p className="text-lg font-bold text-white">{activeMood.label}</p>
                    </div>
                </div>
                <div className="text-xs text-neutral-500 font-medium">Tap to change</div>
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 p-2 rounded-2xl bg-neutral-800 border border-white/10 shadow-xl z-10 grid grid-cols-3 gap-2"
                    >
                        {MOOODS.map((mood) => (
                            <button
                                key={mood.level}
                                onClick={() => {
                                    setCurrentMood(mood.level);
                                    setIsOpen(false);
                                }}
                                className={clsx(
                                    "flex flex-col items-center justify-center p-2 rounded-xl border border-transparent hover:bg-white/5 transition-all",
                                    currentMood === mood.level ? "bg-white/10 border-white/20" : ""
                                )}
                            >
                                <mood.icon className={clsx("w-6 h-6 mb-1", mood.color)} />
                                <span className="text-[10px] font-medium text-neutral-300">{mood.label}</span>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MoodBattery;
