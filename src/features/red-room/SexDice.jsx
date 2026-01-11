import React, { useState } from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

const DATA = {
    actions: [
        { "id": 1, "text": "Жадно вылижи", "intensity": "soft", "category": "oral" },
        { "id": 2, "text": "Глубоко отсоси", "intensity": "hard", "category": "sucking" },
        { "id": 3, "text": "Нежно покусывай", "intensity": "soft", "category": "stimulation" },
        { "id": 4, "text": "Жестко трахни", "intensity": "hard", "category": "penetration" },
        { "id": 5, "text": "Отшлепай ладонью", "intensity": "medium", "category": "impact" },
        { "id": 6, "text": "Массируй маслом", "intensity": "soft", "category": "manual" },
        { "id": 7, "text": "Сжимай рукой", "intensity": "medium", "category": "manual" },
        { "id": 8, "text": "Ласкай языком", "intensity": "soft", "category": "oral" },
        { "id": 9, "text": "Войди пальцами в", "intensity": "medium", "category": "penetration" },
        { "id": 10, "text": "Кончи на", "intensity": "hard", "category": "finish" },
        { "id": 11, "text": "Потрись об", "intensity": "medium", "category": "rubbing" },
        { "id": 12, "text": "Зажми губами", "intensity": "soft", "category": "sucking" }
    ],
    body_parts: [
        {
            "id": 1, "text": "Набухший клитор", "gender": "female",
            "allowed_categories": ["oral", "manual", "stimulation", "sucking", "rubbing"]
        },
        {
            "id": 2, "text": "Твердый член", "gender": "male",
            "allowed_categories": ["manual", "stimulation", "sucking", "rubbing", "finish"]
        },
        {
            "id": 3, "text": "Торчащие соски", "gender": "any",
            "allowed_categories": ["oral", "manual", "stimulation", "sucking", "rubbing", "finish", "impact"]
        },
        {
            "id": 4, "text": "Упругую попку", "gender": "any",
            "allowed_categories": ["penetration", "manual", "impact", "oral", "stimulation", "finish", "rubbing"]
        },
        {
            "id": 5, "text": "Влажную киску", "gender": "female",
            "allowed_categories": ["penetration", "oral", "manual", "stimulation", "rubbing"]
        },
        {
            "id": 6, "text": "Чувствительную шейку", "gender": "any",
            "allowed_categories": ["oral", "stimulation", "sucking", "manual"]
        },
        {
            "id": 7, "text": "Внутреннюю часть бедра", "gender": "any",
            "allowed_categories": ["manual", "stimulation", "oral", "rubbing", "impact"]
        },
        {
            "id": 8, "text": "Яички", "gender": "male",
            "allowed_categories": ["manual", "oral", "stimulation", "rubbing", "sucking"]
        },
        {
            "id": 9, "text": "Грудь", "gender": "female",
            "allowed_categories": ["manual", "oral", "stimulation", "finish", "rubbing", "sucking", "impact"]
        },
        {
            "id": 10, "text": "Промежность", "gender": "any",
            "allowed_categories": ["manual", "oral", "stimulation", "rubbing"]
        },
        {
            "id": 11, "text": "Ушко", "gender": "any",
            "allowed_categories": ["oral", "stimulation", "sucking"]
        },
        {
            "id": 12, "text": "Губы", "gender": "any",
            "allowed_categories": ["manual", "stimulation", "sucking", "rubbing"]
        }
    ],
    "places": [
        { "id": 1, "text": "На кухонном столе" },
        { "id": 2, "text": "В душе под водой" },
        { "id": 3, "text": "Перед зеркалом" },
        { "id": 4, "text": "На полу на коленях" },
        { "id": 5, "text": "На стиральной машине" },
        { "id": 6, "text": "В позе 69", "requires_category": "oral" },
        { "id": 7, "text": "С завязанными глазами" },
        { "id": 8, "text": "Раком (Doggy)" },
        { "id": 9, "text": "Стоя у стены" },
        { "id": 10, "text": "Используя лед" },
        { "id": 11, "text": "Снимая на видео" },
        { "id": 12, "text": "Связав руки ремнем" }
    ]
};

const SexDice = () => {
    const [diceResult, setDiceResult] = useState({
        action: { text: 'Действие' },
        bodyPart: { text: 'Место' },
        place: { text: 'Где/Как' }
    });
    const [isRolling, setIsRolling] = useState(false);

    const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const generateCombination = () => {
        // 1. Pick Action
        const action = getRandomItem(DATA.actions);

        // 2. Pick Body Part compatible with Action Category
        const compatibleBodyParts = DATA.body_parts.filter(bp =>
            bp.allowed_categories.includes(action.category)
        );
        // Fallback to all if somehow no compatible parts (shouldn't happen with this data)
        const bodyPart = compatibleBodyParts.length > 0
            ? getRandomItem(compatibleBodyParts)
            : getRandomItem(DATA.body_parts);

        // 3. Pick Place/Context
        // Filter places that have restrictions
        const compatiblePlaces = DATA.places.filter(p =>
            !p.requires_category || p.requires_category === action.category
        );
        const place = getRandomItem(compatiblePlaces);

        return { action, bodyPart, place };
    };

    const rollDice = () => {
        if (isRolling) return;
        setIsRolling(true);

        // Animation simulation
        let interval = setInterval(() => {
            setDiceResult(generateCombination());
        }, 100);

        setTimeout(() => {
            clearInterval(interval);
            setDiceResult(generateCombination());
            setIsRolling(false);
        }, 1000);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full flex flex-col items-center justify-center gap-8 w-full"
        >
            {/* Dice Container */}
            <div className="flex flex-wrap justify-center gap-3">
                {/* Dice 1: Action */}
                <div className={clsx(
                    "w-28 h-28 rounded-3xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center shadow-[0_0_20px_theme('colors.red.900')]",
                    isRolling && "animate-spin"
                )}>
                    <span className="text-sm font-bold uppercase tracking-wider text-red-400 text-center px-2 leading-tight">
                        {diceResult.action.text}
                    </span>
                </div>

                {/* Dice 2: Body Part */}
                <div className={clsx(
                    "w-28 h-28 rounded-3xl bg-gradient-to-br from-red-600 to-red-800 border-t border-red-400/50 flex items-center justify-center shadow-lg",
                    isRolling && "animate-spin-slow"
                )}>
                    <span className="text-sm font-bold uppercase tracking-wider text-white text-center px-2 leading-tight">
                        {diceResult.bodyPart.text}
                    </span>
                </div>

                {/* Dice 3: Place */}
                <div className={clsx(
                    "w-28 h-28 rounded-3xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center shadow-[0_0_20px_theme('colors.red.900')]",
                    isRolling && "animate-spin"
                )}>
                    <span className="text-white/60 text-xs font-bold uppercase tracking-wider text-center px-2 leading-tight">
                        {diceResult.place.text}
                    </span>
                </div>
            </div>

            <button
                onClick={rollDice}
                disabled={isRolling}
                className="mt-8 px-12 py-5 bg-white text-red-900 rounded-full font-black text-xl uppercase tracking-widest shadow-[0_0_20px_white] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
            >
                {isRolling ? "..." : "Бросить"}
            </button>
        </motion.div>
    );
};

export default SexDice;
