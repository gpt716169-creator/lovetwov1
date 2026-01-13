import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { useThemeStore } from '../store/themeStore';

const NavItem = ({ to, icon, label, isActive }) => {
    return (
        <li>
            <Link
                to={to}
                className={clsx(
                    "flex flex-col items-center gap-1 p-2 transition-colors duration-200",
                    isActive ? "text-primary" : "text-white/40 hover:text-white"
                )}
            >
                <span
                    className="material-symbols-outlined text-[28px]"
                    style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                    {icon}
                </span>
                <span className="text-[10px] font-medium">{label}</span>
            </Link>
        </li>
    );
};

const Layout = () => {
    const location = useLocation();
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
    const { profile } = useTelegramAuth() || {}; // Use safe access

    useEffect(() => {
        const handleFocus = (e) => {
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
                setIsKeyboardOpen(true);
            }
        };
        const handleBlur = () => {
            setTimeout(() => setIsKeyboardOpen(false), 100);
        };

        window.addEventListener('focusin', handleFocus);
        window.addEventListener('focusout', handleBlur);

        // --- ONLINE HEARTBEAT ---
        const updateHeartbeat = async () => {
            if (profile?.id) {
                await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', profile.id);
            }
        };

        // Update immediately and then every 2 minutes
        if (profile?.id) updateHeartbeat();
        const heartbeatInterval = setInterval(() => {
            if (profile?.id) updateHeartbeat();
        }, 120000);

        return () => {
            window.removeEventListener('focusin', handleFocus);
            window.removeEventListener('focusout', handleBlur);
            clearInterval(heartbeatInterval);
        };
    }, [profile?.id]); // Depend only on ID to avoid excessive re-runs

    return (
        <div className="max-w-md mx-auto relative flex flex-col w-full h-full min-h-screen overflow-x-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display">

            {/* Main Content Area */}
            <main className={clsx("flex-1", !isKeyboardOpen && "pb-24")}>
                <Outlet />
            </main>

            {/* Bottom Navigation */}
            <nav className={clsx(
                "fixed bottom-0 w-full max-w-md glass-nav pb-6 pt-2 px-2 z-50 rounded-t-3xl transition-transform duration-300",
                isKeyboardOpen ? "translate-y-full" : "translate-y-0"
            )}>
                <ul className="flex justify-between items-center text-xs">
                    <NavItem to="/" icon="dashboard" label="Home" isActive={location.pathname === '/'} />
                    <NavItem to="/economy" icon="monetization_on" label="Hub" isActive={location.pathname === '/economy'} />

                    {/* Chat is Central */}
                    <div className="relative -top-5">
                        <Link to="/chat" className={clsx(
                            "w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 border-4 border-[#1A1A1A]",
                            location.pathname === '/chat' ? "bg-white text-primary" : "bg-primary text-white"
                        )}>
                            <span className="material-symbols-outlined text-3xl">chat_bubble</span>
                        </Link>
                    </div>

                    <NavItem to="/games" icon="stadia_controller" label="Игры" isActive={location.pathname === '/games'} />
                    <NavItem to="/red-room" icon="lock" label="Red" isActive={location.pathname === '/red-room'} />
                </ul>
            </nav>
        </div>
    );
};

export default Layout;
