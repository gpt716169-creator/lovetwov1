import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X } from 'lucide-react';
import { clsx } from 'clsx';

const TAGS = [
    'Helped with chores', 'Listened well', 'Was irritable',
    'Made me laugh', 'Prepared food', 'Gave compliments'
];

const DailyScore = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [score, setScore] = useState(5);
    const [selectedTags, setSelectedTags] = useState([]);
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Mock time check - ideally enabled by default for testing
    const canVote = true;

    const toggleTag = (tag) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleSubmit = () => {
        console.log({ score, selectedTags });
        setIsSubmitted(true);
        setTimeout(() => {
            setIsOpen(false);
            // Reset for demo purposes
            setIsSubmitted(false);
            setScore(5);
            setSelectedTags([]);
        }, 2000);
    };

    if (!canVote) return null;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-between text-white shadow-lg shadow-indigo-500/20"
            >
                <span className="font-bold">Rate the Day</span>
                <div className="flex bg-white/20 rounded-full px-3 py-1 text-xs font-medium">
                    Open until 23:59
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-neutral-900 w-full max-w-sm rounded-3xl p-6 border border-white/10 relative"
                        >
                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute top-4 right-4 text-neutral-400 hover:text-white"
                            >
                                <X size={24} />
                            </button>

                            <h2 className="text-2xl font-bold text-center mb-2">How was today?</h2>
                            <p className="text-neutral-400 text-center text-sm mb-8">Rate your day with your partner</p>

                            {isSubmitted ? (
                                <div className="py-10 text-center animate-pulse">
                                    <p className="text-xl font-bold text-green-500">Saved! ❤️</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Score Slider */}
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="text-4xl font-bold bg-white/10 w-20 h-20 rounded-full flex items-center justify-center">
                                            {score}
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            value={score}
                                            onChange={(e) => setScore(Number(e.target.value))}
                                            className="w-full accent-indigo-500 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <div className="flex justify-between w-full text-xs text-neutral-500">
                                            <span>Bad</span>
                                            <span>Perfect</span>
                                        </div>
                                    </div>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {TAGS.map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => toggleTag(tag)}
                                                className={clsx(
                                                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                                                    selectedTags.includes(tag)
                                                        ? "bg-indigo-500 border-indigo-500 text-white"
                                                        : "bg-transparent border-neutral-700 text-neutral-400 hover:border-neutral-500"
                                                )}
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={handleSubmit}
                                        className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-colors"
                                    >
                                        Save Rating
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default DailyScore;
