import React, { createContext, useContext, useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { supabase } from '../../lib/supabase';

const TelegramAuthContext = createContext({});

export const TelegramAuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [startParam, setStartParam] = useState(null);
    const [isMock, setIsMock] = useState(false);
    const [profile, setProfile] = useState(null); // Supabase profile

    useEffect(() => {
        const initAuth = async () => {
            let tgUser = null;
            let param = null;

            // 1. Get Telegram User
            if (WebApp.initDataUnsafe?.user) {
                tgUser = WebApp.initDataUnsafe.user;
                param = WebApp.initDataUnsafe.start_param;
                WebApp.ready();
                WebApp.expand();
            } else {
                console.warn("Telegram WebApp not detected. Using Mock Data.");
                setIsMock(true);
                tgUser = {
                    id: 123456789,
                    first_name: "Mock Konstantin",
                    last_name: "User",
                    username: "konstantin_mock",
                    language_code: "ru",
                    photo_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                };
            }

            if (tgUser) {
                setUser(tgUser);
                setStartParam(param);

                // 2. Sync with Supabase (Create/Update self)
                let currentProfile = null;
                try {
                    const { data, error } = await supabase
                        .from('profiles')
                        .upsert({
                            telegram_id: tgUser.id,
                            first_name: tgUser.first_name,
                            username: tgUser.username,
                            photo_url: tgUser.photo_url,
                        }, { onConflict: 'telegram_id' })
                        .select()
                        .single();

                    if (error) throw error;
                    currentProfile = data;
                    setProfile(data);
                    console.log("Supabase Profile Synced:", data);
                } catch (err) {
                    console.error("Error syncing profile:", err);
                    setProfile({ ...tgUser, balance: 100, theme: 'red' });
                }

                // 3. Handle Pairing (if startParam exists and user is not paired)
                if (param && param.startsWith('ref_') && currentProfile && !currentProfile.partner_id) {
                    const referrerTelegramId = parseInt(param.replace('ref_', ''), 10);

                    if (referrerTelegramId && referrerTelegramId !== tgUser.id) {
                        try {
                            console.log("Attempting to pair with:", referrerTelegramId);
                            // Find referrer profile
                            const { data: referrer, error: refError } = await supabase
                                .from('profiles')
                                .select('id')
                                .eq('telegram_id', referrerTelegramId)
                                .single();

                            if (referrer) {
                                // Update ME -> Partner = Referrer
                                const { error: updateMe } = await supabase
                                    .from('profiles')
                                    .update({ partner_id: referrer.id })
                                    .eq('id', currentProfile.id);

                                // Update THEM -> Partner = Me (optimistic, works if RLS allows)
                                const { error: updateThem } = await supabase
                                    .from('profiles')
                                    .update({ partner_id: currentProfile.id })
                                    .eq('id', referrer.id);

                                if (!updateMe && !updateThem) {
                                    console.log("Pairing Successful!");
                                    // Refresh profile
                                    setProfile(prev => ({ ...prev, partner_id: referrer.id }));
                                    alert("Вы успешно связали профили с партнером!");
                                }
                            }
                        } catch (pairErr) {
                            console.error("Pairing failed:", pairErr);
                        }
                    }
                }
            }
        };

        initAuth();
    }, []);

    const getInviteLink = () => {
        if (!user) return "";
        const botUsername = "TwoOfUsBot";
        return `https://t.me/${botUsername}/app?startapp=ref_${user.id}`;
    };

    return (
        <TelegramAuthContext.Provider value={{ user, profile, startParam, isMock, getInviteLink }}>
            {children}
        </TelegramAuthContext.Provider>
    );
};

export const useTelegramAuth = () => useContext(TelegramAuthContext);
