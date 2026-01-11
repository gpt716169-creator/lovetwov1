import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useEconomyStore = create((set, get) => ({
    balance: 0,
    transactions: [],
    tasks: [],
    wishlist: [],
    shoppingList: [],
    isLoading: false,

    fetchEconomyData: async (userId) => {
        if (!userId) return;
        set({ isLoading: true });
        try {
            // 1. Get Balance
            const { data: profile } = await supabase
                .from('profiles')
                .select('balance')
                .eq('telegram_id', userId)
                .single();

            // 2. Get Transactions
            const { data: activity } = await supabase
                .from('transactions') // Note: 'transactions' might be reserved in some SQL, check schema name
                .select('*')
                .eq('user_id', (await getProfileId(userId))) // Need UUID, not TG ID
                .order('created_at', { ascending: false })
                .limit(20);

            // 3. Get Tasks
            const { data: tasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('status', 'active'); // simplified for now

            // 4. Get Wishlist
            const { data: wishlist } = await supabase
                .from('wishlist_items')
                .select('*')
                .eq('is_purchased', false);

            // 5. Get Shopping List
            const { data: shoppingList } = await supabase
                .from('shopping_list')
                .select('*')
                .order('created_at', { ascending: false });

            set({
                balance: profile?.balance || 0,
                transactions: activity || [],
                tasks: tasks || [],
                wishlist: wishlist || [],
                shoppingList: shoppingList || [],
                isLoading: false
            });
        } catch (error) {
            console.error('Error fetching economy:', error);
            set({ isLoading: false });
        }
    },

    addCoins: async (user, amount, reason, taskId = null) => {
        const currentBalance = get().balance;
        // Optimistic Update
        set({ balance: currentBalance + amount });

        try {
            const profileId = await getProfileId(user.id);
            if (!profileId) throw new Error("Profile not found");

            // 1. Log Transaction
            const { error: txError } = await supabase
                .from('transactions')
                .insert({
                    user_id: profileId,
                    amount: amount,
                    description: reason,
                    related_task_id: taskId
                });
            if (txError) throw txError;

            // 2. Update Profile Balance
            const { error: balError } = await supabase
                .from('profiles')
                .update({ balance: currentBalance + amount })
                .eq('id', profileId);

            if (balError) throw balError;

        } catch (error) {
            console.error('Add coins error:', error);
            set({ balance: currentBalance }); // Rollback
        }
    },

    spendCoins: async (user, amount, reason, itemId = null) => {
        const currentBalance = get().balance;
        if (currentBalance < amount) return;

        // Optimistic Update
        set({ balance: currentBalance - amount });

        try {
            const profileId = await getProfileId(user.id);
            if (!profileId) throw new Error("Profile not found");

            // 1. Log Transaction
            const { error: txError } = await supabase
                .from('transactions')
                .insert({
                    user_id: profileId,
                    amount: -amount,
                    description: reason,
                    related_item_id: itemId
                });
            if (txError) throw txError;

            // 2. Update Profile Balance
            const { error: balError } = await supabase
                .from('profiles')
                .update({ balance: currentBalance - amount })
                .eq('id', profileId);

            if (balError) throw balError;

            // 3. If it's an item, mark purchased (optional, simplified)
            if (itemId) {
                await supabase.from('wishlist_items').update({ is_purchased: true }).eq('id', itemId);
                // Update local wishlist
                set(state => ({ wishlist: state.wishlist.filter(i => i.id !== itemId) }));
            }

        } catch (error) {
            console.error('Spend coins error:', error);
            set({ balance: currentBalance }); // Rollback
        }
    },

    // --- Shopping List Actions ---

    addShoppingItem: async (user, title) => {
        const tempId = Date.now().toString(); // Optimistic ID
        const newItem = { id: tempId, title, is_checked: false, created_at: new Date() };

        set(state => ({ shoppingList: [newItem, ...state.shoppingList] }));

        try {
            const profileId = await getProfileId(user.id);
            const { data, error } = await supabase
                .from('shopping_list')
                .insert({ created_by: profileId, title })
                .select()
                .single();

            if (error) throw error;

            // Replace optimisitc item with real one
            set(state => ({
                shoppingList: state.shoppingList.map(i => i.id === tempId ? data : i)
            }));
        } catch (error) {
            console.error('Error adding list item:', error);
            set(state => ({ shoppingList: state.shoppingList.filter(i => i.id !== tempId) })); // Rollback
        }
    },

    toggleShoppingItem: async (itemId, isChecked) => {
        set(state => ({
            shoppingList: state.shoppingList.map(i =>
                i.id === itemId ? { ...i, is_checked: !isChecked } : i
            )
        }));

        try {
            await supabase
                .from('shopping_list')
                .update({ is_checked: !isChecked })
                .eq('id', itemId);
        } catch (error) {
            console.error('Error toggling list item:', error);
            set(state => ({
                shoppingList: state.shoppingList.map(i =>
                    i.id === itemId ? { ...i, is_checked: isChecked } : i // Rollback
                )
            }));
        }
    },

    deleteShoppingItem: async (itemId) => {
        const oldList = get().shoppingList;
        set(state => ({
            shoppingList: state.shoppingList.filter(i => i.id !== itemId)
        }));

        try {
            await supabase.from('shopping_list').delete().eq('id', itemId);
        } catch (error) {
            console.error('Error deleting list item:', error);
            set({ shoppingList: oldList }); // Rollback
        }
    }
}));

// Helper to resolve generic user.id (TG ID) to Supabase UUID
async function getProfileId(telegramId) {
    const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('telegram_id', telegramId)
        .single();
    return data?.id;
}
