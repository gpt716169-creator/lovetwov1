import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useTelegramAuth } from '../auth/TelegramAuth';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

const Chat = () => {
    const { profile } = useTelegramAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [partnerStatus, setPartnerStatus] = useState('offline');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (profile?.id && profile?.partner_id) {
            fetchMessages();
            fetchPartnerStatus();

            // Subscribe to new messages
            const msgChannel = supabase.channel('chat_room')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${profile.id}` // Listen for incoming
                }, (payload) => {
                    // Fetch sender name if needed, or just append
                    setMessages(prev => [...prev, payload.new]);
                    scrollToBottom();
                })
                .subscribe();

            // Subscribe to partner status (last_seen updates)
            const statusChannel = supabase.channel('partner_status')
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${profile.partner_id}`
                }, (payload) => {
                    checkOnlineStatus(payload.new.last_seen);
                })
                .subscribe();

            return () => {
                supabase.removeChannel(msgChannel);
                supabase.removeChannel(statusChannel);
            };
        }
    }, [profile]);

    const fetchMessages = async () => {
        const { data } = await supabase.from('messages')
            .select('*')
            .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
            .order('created_at', { ascending: true })
            .limit(100);

        if (data) {
            setMessages(data);
            setLoading(false);
            scrollToBottom();
        }
    };

    const fetchPartnerStatus = async () => {
        const { data } = await supabase.from('profiles').select('last_seen').eq('id', profile.partner_id).single();
        if (data) checkOnlineStatus(data.last_seen);
    };

    const checkOnlineStatus = (lastSeen) => {
        if (!lastSeen) return;
        const diff = new Date() - new Date(lastSeen);
        // Considered online if active in last 2 minutes
        if (diff < 2 * 60 * 1000) setPartnerStatus('online');
        else setPartnerStatus('offline');
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const msgContent = newMessage.trim();
        setNewMessage('');

        // Optimistic UI update
        const tempMsg = {
            id: 'temp-' + Date.now(),
            sender_id: profile.id,
            content: msgContent,
            created_at: new Date().toISOString(),
            is_temp: true
        };
        setMessages(prev => [...prev, tempMsg]);
        scrollToBottom();

        const { data, error } = await supabase.from('messages').insert({
            sender_id: profile.id,
            receiver_id: profile.partner_id,
            content: msgContent
        }).select().single();

        if (error) {
            console.error("Failed to send:", error);
            // Remove temp message or show error
        } else {
            // Replace temp message with real one
            setMessages(prev => prev.map(m => m.id === tempMsg.id ? data : m));
        }
    };

    const formatTime = (isoString) => {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark pb-20">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-surface-dark/95 backdrop-blur-xl sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                            {profile?.partner_id ? 'P' : '?'}
                        </div>
                        {partnerStatus === 'online' && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-surface-dark rounded-full animate-pulse"></div>
                        )}
                    </div>
                    <div>
                        <h2 className="text-white font-bold text-sm">Любимка</h2>
                        <p className={clsx("text-xs font-medium", partnerStatus === 'online' ? "text-green-400" : "text-white/40")}>
                            {partnerStatus === 'online' ? "В сети" : "Был(а) недавно"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = msg.sender_id === profile?.id;
                        const showDate = idx === 0 || new Date(msg.created_at).getDate() !== new Date(messages[idx - 1].created_at).getDate();

                        return (
                            <React.Fragment key={msg.id}>
                                {showDate && (
                                    <div className="text-center my-4">
                                        <span className="text-[10px] text-white/30 bg-white/5 px-2 py-1 rounded-full">
                                            {new Date(msg.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={clsx(
                                        "max-w-[80%] rounded-2xl p-3 text-sm relative",
                                        isMe
                                            ? "bg-primary text-white self-end rounded-tr-none shadow-lg shadow-primary/20"
                                            : "bg-surface-dark text-white self-start rounded-tl-none border border-white/5"
                                    )}
                                >
                                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                    <div className={clsx("text-[9px] mt-1 flex items-center justify-end gap-1", isMe ? "text-white/50" : "text-white/30")}>
                                        {formatTime(msg.created_at)}
                                        {isMe && (
                                            <span className="material-symbols-outlined text-[10px]">
                                                {msg.id.startsWith('temp') ? 'schedule' : 'done_all'}
                                            </span>
                                        )}
                                    </div>
                                </motion.div>
                            </React.Fragment>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={sendMessage} className="p-3 bg-surface-dark border-t border-white/5 flex gap-2 items-end pb-safe">
                <input
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Сообщение..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:border-primary outline-none min-h-[44px] max-h-[100px]"
                />
                <button
                    disabled={!newMessage.trim()}
                    type="submit"
                    className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-all disabled:opacity-50 disabled:scale-100"
                >
                    <span className="material-symbols-outlined">send</span>
                </button>
            </form>
        </div>
    );
};

export default Chat;
