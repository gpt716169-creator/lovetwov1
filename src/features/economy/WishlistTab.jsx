import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTelegramAuth } from '../auth/TelegramAuth';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';

const WishlistTab = ({ wishlist, fetchEconomyData, balance, spendCoins }) => {
    const { user, profile } = useTelegramAuth();
    const [subTab, setSubTab] = useState('buy'); // 'buy' | 'sell'
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [price, setPrice] = useState(100);
    const [itemType, setItemType] = useState('buy'); // 'buy' or 'sell'
    const [loading, setLoading] = useState(false);

    const filteredItems = wishlist.filter(item => {
        // "Buy" tab shows items I want to buy? Or items available to buy?
        // Usually:
        // 'buy' tab = All items of type 'buy' (Wishes people want to fulfill) AND 'sell' (Coupons people are selling).
        // Let's stick to user request: "Create what I want to buy" vs "Create what I want to sell".
        // If I create "Buy" (Wish), it means I want it. Partner sees it and can "Gift" it? Or I buy it?
        // User said: "I can create what I want to buy, and what I want to sell".
        // Let's list items based on type.
        return item.type === subTab || (!item.type && subTab === 'buy'); // Default to buy for old items
    });

    const handleCreateItem = async () => {
        if (!title.trim() || !profile?.id) return;
        setLoading(true);

        const { error } = await supabase.from('wishlist_items').insert({
            title,
            description: desc,
            price: price,
            created_by: profile.id,
            type: itemType
        });

        if (error) alert("Ошибка: " + error.message);
        else {
            setIsModalOpen(false);
            setTitle('');
            setDesc('');
            setPrice(100);
            fetchEconomyData(user.id);
            // Telegram Notification (Only for Wishes/Buy items)
            if (itemType === 'buy') {
                import('../../services/telegramNotificationService').then(({ TelegramService }) => {
                    TelegramService.notifyNewWish(profile.partner_id, profile.first_name, title, price);
                });
            }
        }
        setLoading(false);
    };

    const handleTransaction = (item) => {
        if (item.type === 'sell') {
            // "Sell" items (e.g., Massage Coupon). Partner buys it.
            // If I am the creator, I shouldn't buy my own coupon?
            if (item.created_by === profile.id) {
                alert("Это ваше предложение. Партнер может его купить.");
                return;
            }
            if (balance >= item.price) {
                spendCoins(user, item.price, `Куплено: ${item.title}`, item.id);
                alert("Успешно куплено!");
            } else {
                alert("Недостаточно средств!");
            }
        } else {
            // "Buy" items (Wishlist). e.g., "New Dress".
            // If I created it, I am saving up for it. I click buy to deduct from MY balance.
            if (balance >= item.price) {
                spendCoins(user, item.price, `Исполнено желание: ${item.title}`, item.id);
                // Mark as purchased in DB?
                supabase.from('wishlist_items').update({ is_purchased: true }).eq('id', item.id).then(() => fetchEconomyData(user.id));
                alert("Поздравляю! Желание исполнено.");
            } else {
                alert("Копите дальше! Не хватает монет.");
            }
        }
    };

    const [selectedItem, setSelectedItem] = useState(null);

    // ... existing handlers ...

    return (
        <section className="animate-fade-in relative">
            <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-xl font-bold dark:text-white text-slate-800">Список Желаний</h2>
                <div className="flex bg-white/5 p-1 rounded-lg">
                    <button
                        onClick={() => setSubTab('buy')}
                        className={clsx("px-3 py-1 text-xs font-bold rounded-md transition-all", subTab === 'buy' ? "bg-primary text-white" : "text-white/50")}
                    >
                        Хочу купить
                    </button>
                    <button
                        onClick={() => setSubTab('sell')}
                        className={clsx("px-3 py-1 text-xs font-bold rounded-md transition-all", subTab === 'sell' ? "bg-primary text-white" : "text-white/50")}
                    >
                        Продаю
                    </button>
                </div>
            </div>

            <button
                onClick={() => { setItemType(subTab); setIsModalOpen(true); }}
                className="w-full py-3 rounded-xl border border-dashed border-white/20 text-white/40 font-bold text-sm mb-4 hover:bg-white/5 hover:text-white transition-all flex items-center justify-center gap-2"
            >
                <span className="material-symbols-outlined">add_circle</span>
                <span>Добавить в {subTab === 'buy' ? '"Хочу купить"' : '"Продаю"'}</span>
            </button>

            <div className="grid grid-cols-2 gap-3 pb-20">
                {filteredItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        disabled={item.is_purchased}
                        className={clsx(
                            "glass-panel p-4 rounded-2xl flex flex-col items-center gap-3 text-center transition-transform active:scale-95 group hover:border-primary/50 relative overflow-hidden",
                            item.is_purchased && "opacity-50 grayscale"
                        )}
                    >
                        {item.is_purchased && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
                                <span className="text-green-400 font-bold border-2 border-green-400 px-2 py-1 transform -rotate-12 rounded opacity-80 uppercase tracking-widest text-xs">Куплено</span>
                            </div>
                        )}
                        <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center text-3xl mb-1 shadow-inner group-hover:bg-primary/20 group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined">
                                {item.type === 'sell' ? 'local_offer' : 'favorite'}
                            </span>
                        </div>
                        <div>
                            <h3 className="font-bold text-sm leading-tight dark:text-white line-clamp-2 min-h-[2.5em]">{item.title}</h3>
                            <p className="text-[10px] dark:text-white/50 mt-1 line-clamp-1">{item.description}</p>
                        </div>
                        <div className="w-full mt-auto relative z-20">
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!item.is_purchased) handleTransaction(item);
                                }}
                                className="w-full py-2 bg-surface-dark group-hover:bg-primary group-hover:text-white border border-white/10 rounded-full flex items-center justify-center gap-1.5 transition-all text-xs font-bold text-gold cursor-pointer"
                            >
                                <span>{item.price}</span>
                                <span className="material-symbols-outlined text-[14px] filled">monetization_on</span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Create Modal - Existing code will be below this replacement block in the file, need to ensure I don't overwrite it incorrectly. 
               Wait, the tool replaces CONTIGUOUS blocks. I am replacing from return start to end of list. 
               So I need to include the Create Modal in the replacement OR stop before it. 
               The Diff is huge. 
               I will stop BEFORE the Create Modal.
             */}


            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4"
                    >
                        <motion.div
                            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                            className="w-full sm:max-w-sm bg-[#1A1A1A] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">
                                    {itemType === 'buy' ? 'Мое желание' : 'Предложение'}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-white/40 font-bold uppercase ml-1">Название</label>
                                    <input
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder={itemType === 'buy' ? "Новые кроссовки" : "Массаж 30 мин"}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-primary/50 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-white/40 font-bold uppercase ml-1">Описание</label>
                                    <textarea
                                        value={desc}
                                        onChange={e => setDesc(e.target.value)}
                                        placeholder="Детали..."
                                        rows={3}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary/50 transition-all resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-white/40 font-bold uppercase ml-1">Цена (ЛавКоины)</label>
                                    <div className="flex items-center gap-4 mt-1">
                                        <input
                                            type="range" min="10" max="1000" step="10"
                                            value={price}
                                            onChange={e => setPrice(Number(e.target.value))}
                                            className="flex-1 accent-primary h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <div className="w-16 h-10 rounded-xl bg-white/5 flex items-center justify-center font-bold text-gold border border-white/10">
                                            {price}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleCreateItem}
                                    disabled={loading}
                                    className="w-full bg-primary text-white font-bold py-4 rounded-xl mt-4 shadow-lg shadow-primary/20 active:scale-95 transition-all"
                                >
                                    {loading ? "Сохранение..." : "Добавить"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedItem && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setSelectedItem(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#1e1e1e] border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-3xl shadow-lg border border-white/10">
                                        <span className="material-symbols-outlined text-white">
                                            {selectedItem.type === 'sell' ? 'local_offer' : 'favorite'}
                                        </span>
                                    </div>
                                    <button onClick={() => setSelectedItem(null)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10">
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>

                                <h3 className="text-2xl font-bold text-white mb-2 leading-tight">{selectedItem.title}</h3>

                                <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/5 max-h-40 overflow-y-auto">
                                    <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                                        {selectedItem.description || "Нет описания."}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Стоимость</span>
                                        <span className="text-2xl font-black text-gold drop-shadow-sm">{selectedItem.price} 🪙</span>
                                    </div>
                                    {selectedItem.created_by === profile?.id ? (
                                        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold text-white/30 uppercase">
                                            Ваш лот
                                        </div>
                                    ) : (
                                        <div className="px-3 py-1 rounded-full bg-primary/20 border border-primary/20 text-[10px] font-bold text-primary uppercase">
                                            Доступно
                                        </div>
                                    )}
                                </div>

                                {!selectedItem.is_purchased && (
                                    <button
                                        onClick={() => {
                                            handleTransaction(selectedItem);
                                            setSelectedItem(null);
                                        }}
                                        className="w-full py-4 bg-gradient-to-r from-gold to-yellow-600 rounded-xl text-black font-black shadow-lg shadow-gold/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                                    >
                                        <span className="material-symbols-outlined filled">shopping_cart</span>
                                        {selectedItem.type === 'sell' ? 'Купить Купон' : 'Исполнить Желание'}
                                    </button>
                                )}
                                {selectedItem.is_purchased && (
                                    <div className="w-full py-4 bg-white/5 border border-white/10 rounded-xl text-white/50 font-bold flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined">check_circle</span>
                                        Уже приобретено
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};

export default WishlistTab;
