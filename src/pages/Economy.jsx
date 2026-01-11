import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { useEconomyStore } from '../store/economyStore';
import { useNavigate } from 'react-router-dom';
import { useTelegramAuth } from '../features/auth/TelegramAuth';
import PageTransition from '../components/PageTransition';

import QuestsTab from '../features/economy/QuestsTab';
import WishlistTab from '../features/economy/WishlistTab';
import ListsTab from '../features/economy/ListsTab';

const Economy = () => {
    const navigate = useNavigate();
    const { user, profile } = useTelegramAuth();
    const { balance, tasks, wishlist, fetchEconomyData, isLoading, addCoins, spendCoins } = useEconomyStore();
    const [activeTab, setActiveTab] = useState('quests'); // 'quests' | 'wishlist' | 'lists'

    // Filter data for privacy (Client-side safety net)
    const validPartner = profile?.partner_id;
    const filteredTasks = tasks.filter(t =>
        t.created_by === profile?.id ||
        (validPartner && t.created_by === validPartner)
    );
    const filteredWishlist = wishlist.filter(w =>
        w.created_by === profile?.id ||
        (validPartner && w.created_by === validPartner)
    );

    useEffect(() => {
        if (user) {
            fetchEconomyData(user.id);
        }
    }, [user, fetchEconomyData]);

    return (
        <PageTransition className="flex flex-col gap-6 px-5 mt-6 pb-24 h-full">
            {/* Top Header */}
            <header className="sticky top-0 z-40 w-full pt-6 pb-2 bg-background-light dark:bg-background-dark/80 backdrop-blur-md border-b border-white/5">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 active:bg-white/10 transition-colors"
                    >
                        <span className="material-symbols-outlined text-black/80 dark:text-white/80">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-extrabold tracking-tight">Hub</h1>
                    <div className="flex items-center gap-1.5 bg-surface-dark/80 px-3 py-1.5 rounded-full border border-white/5 shadow-inner">
                        <span className="material-symbols-outlined text-gold text-[20px] filled">monetization_on</span>
                        <span className="text-gold text-sm font-bold tracking-wide">{isLoading ? '...' : balance}</span>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="relative p-1 bg-surface-dark rounded-full flex items-center justify-between shadow-inner border border-white/5">
                    <button
                        onClick={() => setActiveTab('quests')}
                        className={clsx(
                            "flex-1 py-2.5 rounded-full flex items-center justify-center gap-2 transition-all duration-300",
                            activeTab === 'quests' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-white/50 hover:text-white"
                        )}
                    >
                        <span className="material-symbols-outlined text-[18px]">checklist</span>
                        <span className="text-sm font-bold">Квесты</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('wishlist')}
                        className={clsx(
                            "flex-1 py-2.5 rounded-full flex items-center justify-center gap-2 transition-all duration-300",
                            activeTab === 'wishlist' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-white/50 hover:text-white"
                        )}
                    >
                        <span className="material-symbols-outlined text-[18px]">favorite</span>
                        <span className="text-sm font-medium">Желания</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('lists')}
                        className={clsx(
                            "flex-1 py-2.5 rounded-full flex items-center justify-center gap-2 transition-all duration-300",
                            activeTab === 'lists' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-white/50 hover:text-white"
                        )}
                    >
                        <span className="material-symbols-outlined text-[18px]">list</span>
                        <span className="text-sm font-medium">Списки</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex flex-col gap-4 animate-fade-in min-h-[500px]">
                {activeTab === 'quests' && (
                    <QuestsTab
                        tasks={filteredTasks}
                        fetchEconomyData={fetchEconomyData}
                        balance={balance}
                        addCoins={addCoins}
                    />
                )}

                {activeTab === 'wishlist' && (
                    <WishlistTab
                        wishlist={filteredWishlist}
                        fetchEconomyData={fetchEconomyData}
                        balance={balance}
                        spendCoins={spendCoins}
                    />
                )}

                {activeTab === 'lists' && (
                    <ListsTab />
                )}
            </main>
        </PageTransition>
    );
};

export default Economy;
