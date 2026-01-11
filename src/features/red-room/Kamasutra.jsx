import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { supabase } from '../../lib/supabase';
import { useTelegramAuth } from '../auth/TelegramAuth';

const Kamasutra = () => {
    const { profile } = useTelegramAuth();
    const [poses, setPoses] = useState([]);
    const [interactions, setInteractions] = useState({});
    const [filter, setFilter] = useState('all'); // 'all', 'favorite', 'tried'
    const [selectedPose, setSelectedPose] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPoses();
    }, []);

    useEffect(() => {
        if (profile?.id) fetchInteractions();
    }, [profile]);

    const fetchPoses = async () => {
        const { data, error } = await supabase
            .from('kamasutra_poses')
            .select('*')
            .order('id', { ascending: true }); // Assuming numeric ID or sortable

        if (data) setPoses(data);
        setLoading(false);
    };

    const fetchInteractions = async () => {
        const { data } = await supabase.from('kamasutra_interactions').select('*').eq('user_id', profile.id);
        const map = {};
        data?.forEach(item => {
            map[item.pose_id] = { favorite: item.is_favorite, tried: item.is_tried };
        });
        setInteractions(map);
    };

    const toggleStatus = async (e, poseId, type) => {
        e.stopPropagation(); // Prevent opening modal
        const current = interactions[poseId] || { favorite: false, tried: false };
        const updates = { ...current, [type]: !current[type] };

        // Optimistic
        setInteractions(prev => ({ ...prev, [poseId]: updates }));

        // DB Update
        const { error } = await supabase.from('kamasutra_interactions').upsert({
            user_id: profile.id,
            pose_id: String(poseId),
            is_favorite: updates.favorite,
            is_tried: updates.tried
        }, { onConflict: 'user_id, pose_id' });
    };

    const pickRandom = () => {
        if (poses.length === 0) return;
        const r = poses[Math.floor(Math.random() * poses.length)];
        setSelectedPose(r);
    };

    const filteredPoses = poses.filter(p => {
        const s = interactions[p.id] || {};
        if (filter === 'favorite') return s.favorite;
        if (filter === 'tried') return s.tried;
        return true;
    });

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col w-full">
            {/* Controls */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 hide-scrollbar">
                {['all', 'favorite', 'tried'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={clsx(
                            "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors border whitespace-nowrap",
                            filter === f ? "bg-red-600 border-red-600 text-white" : "border-white/10 text-white/40 hover:text-white"
                        )}
                    >
                        {f === 'all' ? `Все ${poses.length}` : f === 'favorite' ? 'Любимые' : 'Пробовали'}
                    </button>
                ))}
                <button
                    onClick={pickRandom}
                    className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border border-white/20 text-white bg-white/5 hover:bg-white/10 whitespace-nowrap ml-auto"
                >
                    🎲 Случайная
                </button>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center text-white/40">Загрузка поз...</div>
            ) : (
                <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 pb-20 no-scrollbar">
                    {filteredPoses.map(pose => {
                        const status = interactions[pose.id] || {};
                        return (
                            <div
                                key={pose.id}
                                onClick={() => setSelectedPose(pose)}
                                className="relative aspect-square bg-white/5 rounded-2xl border border-white/5 p-4 flex flex-col justify-between group overflow-hidden cursor-pointer hover:bg-white/10 transition-colors"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-red-600/0 group-hover:bg-red-600 transition-colors"></div>

                                {/* Card Content (Simplified for Grid) */}
                                <div className="flex-1">
                                    <h4 className="text-white font-bold text-lg leading-tight mb-1">{pose.name}</h4>
                                    <div className="flex gap-1 flex-wrap mt-1">
                                        <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-white/50">{pose.category}</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-end mt-2 pt-2 border-t border-white/5">
                                    <div className="text-[10px] text-white/20 font-mono">
                                        LVL {pose.difficulty}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => toggleStatus(e, pose.id, 'tried')}
                                            className={clsx(
                                                "w-8 h-8 rounded-full flex items-center justify-center transition-colors border",
                                                status.tried ? "bg-green-500/20 border-green-500 text-green-400" : "border-white/10 text-white/20 hover:border-green-500/50"
                                            )}
                                        >
                                            <span className="material-symbols-outlined text-sm">check</span>
                                        </button>
                                        <button
                                            onClick={(e) => toggleStatus(e, pose.id, 'favorite')}
                                            className={clsx(
                                                "w-8 h-8 rounded-full flex items-center justify-center transition-colors border",
                                                status.favorite ? "bg-red-500/20 border-red-500 text-red-500" : "border-white/10 text-white/20 hover:border-red-500/50"
                                            )}
                                        >
                                            <span className="material-symbols-outlined text-sm">favorite</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Details Modal */}
            <AnimatePresence>
                {selectedPose && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md" onClick={() => setSelectedPose(null)}>
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="bg-zinc-900 border border-red-500/30 w-full max-w-sm rounded-[2rem] p-0 shadow-[0_0_50px_rgba(220,38,38,0.3)] text-center relative overflow-hidden flex flex-col max-h-[80vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header Image Placeholder */}
                            <div className="h-48 bg-gradient-to-br from-red-900/40 to-black w-full flex items-center justify-center relative">
                                <span className="material-symbols-outlined text-6xl text-white/10">{selectedPose.image_url ? 'image' : 'local_florist'}</span>
                                <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-zinc-900 to-transparent"></div>
                                <div className="absolute top-4 right-4 flex flex-col gap-2">
                                    <div className="bg-black/50 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10">
                                        Сложность: {selectedPose.difficulty}/5
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 pt-2 overflow-y-auto">
                                <div className="mb-6">
                                    <span className="text-xs text-red-400 font-bold tracking-widest uppercase mb-1 block">{selectedPose.category}</span>
                                    <h3 className="text-2xl font-black text-white uppercase leading-none">{selectedPose.name}</h3>
                                </div>

                                <p className="text-white/80 text-base leading-relaxed mb-8 text-left bg-white/5 p-4 rounded-xl border border-white/5">
                                    {selectedPose.description}
                                </p>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setSelectedPose(null)}
                                        className="flex-1 py-3 bg-white/5 border border-white/10 text-white font-bold rounded-xl uppercase tracking-widest hover:bg-white/10 transition-colors"
                                    >
                                        Закрыть
                                    </button>

                                    {/* Action Buttons in Modal */}
                                    <button
                                        onClick={(e) => toggleStatus(e, selectedPose.id, 'tried')}
                                        className={clsx(
                                            "flex-1 py-3 border font-bold rounded-xl uppercase tracking-widest flex items-center justify-center gap-2 transition-colors",
                                            interactions[selectedPose.id]?.tried
                                                ? "bg-green-500/20 border-green-500 text-green-400"
                                                : "border-white/10 text-white/40 hover:text-white"
                                        )}
                                    >
                                        <span className="material-symbols-outlined">check</span>
                                    </button>
                                    <button
                                        onClick={(e) => toggleStatus(e, selectedPose.id, 'favorite')}
                                        className={clsx(
                                            "flex-1 py-3 border font-bold rounded-xl uppercase tracking-widest flex items-center justify-center gap-2 transition-colors",
                                            interactions[selectedPose.id]?.favorite
                                                ? "bg-red-500/20 border-red-500 text-red-500"
                                                : "border-white/10 text-white/40 hover:text-white"
                                        )}
                                    >
                                        <span className="material-symbols-outlined">favorite</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Kamasutra;
