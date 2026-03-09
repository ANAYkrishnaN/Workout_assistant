/**
 * Daily motivational quotes (fitness/hydration). One quote per day, deterministic by date.
 * Does NOT change when switching tabs — based on calendar date hash only.
 */

const QUOTES = [
    "Consistency beats intensity.",
    "Water is the driving force of all nature. — Leonardo da Vinci",
    "Stay hydrated, stay strong. Your body runs on water.",
    "The best time to drink water was 20 minutes ago. The second best time is now.",
    "Hydration isn't a trend. It's the foundation of performance.",
    "Drink water like your workouts depend on it — because they do.",
    "Small sips throughout the day beat a gallon at once.",
    "Your brain is 73% water. Keep it topped up.",
    "Sweat is just your body asking for more water.",
    "Hydration + consistency = results.",
    "Water doesn't add calories. It adds clarity and energy.",
    "Before coffee, drink water. Before the gym, drink water.",
    "The body is 60% water. Make sure yours is the good 60%.",
    "Recovery starts with rehydration.",
    "Drink first, then crush the workout.",
    "One more glass could be the difference between good and great.",
    "Hydration is the cheapest performance boost you'll ever get.",
    "Don't wait for thirst. Thirst is already late.",
    "Water: the original energy drink.",
    "Every sip counts. Track it, own it.",
];

/**
 * Deterministic index from date string (YYYY-MM-DD). Same date = same quote all day.
 * @param {string} [dateStr] - Optional YYYY-MM-DD; defaults to today in local date.
 * @returns {string}
 */
export function getQuoteForToday(dateStr) {
    const d = dateStr || new Date().toISOString().slice(0, 10);
    let hash = 0;
    for (let i = 0; i < d.length; i++) {
        const char = d.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    const index = Math.abs(hash) % QUOTES.length;
    return QUOTES[index];
}

export default getQuoteForToday;
