/**
 * ML-based diet generation: calls FastAPI /predict-diet, then builds meal plan from ingredients + macros.
 * No LLM usage.
 */
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const GOAL_TO_BACKEND = {
    maintenance: 'maintenance',
    weight_loss: 'weight_loss',
    muscle_gain: 'muscle_gain',
    'Lose Weight': 'weight_loss',
    'Build Muscle': 'muscle_gain',
    'Get Fit': 'maintenance',
    'General Fitness': 'maintenance',
    'Weight Loss': 'weight_loss',
    'Muscle Gain': 'muscle_gain',
};

function normalizeGoal(goal) {
    if (!goal || typeof goal !== 'string') return 'maintenance';
    const g = goal.trim();
    return GOAL_TO_BACKEND[g] || 'maintenance';
}

function normalizeGender(gender) {
    if (!gender || typeof gender !== 'string') return 'male';
    const g = String(gender).trim().toLowerCase();
    if (g === 'female' || g === 'f') return 'female';
    return 'male';
}

/**
 * Build meal plan strings from ingredients and macro targets (no LLM).
 */
function buildMealPlan(ingredients, macros) {
    const ing = Array.isArray(ingredients) ? ingredients.filter((i) => typeof i === 'string' && i.trim()) : [];
    const list = ing.length ? ing.map((i) => i.trim()).join(', ') : 'varied ingredients';
    const p = Math.round(macros.protein || 0);
    const c = Math.round(macros.carbs || 0);
    const f = Math.round(macros.fats || 0);
    return {
        breakfast: `Breakfast using ${list}. Target: ~${Math.round(p / 3)}g protein.`,
        lunch: `Lunch with ${list}. Target: ~${Math.round(c / 3)}g carbs, balanced protein.`,
        dinner: `Dinner combining ${list}. Balanced: protein, carbs, fats.`,
        totalCalories: Math.round(macros.totalCalories || 0),
        macros: { protein: p, carbs: c, fats: f },
    };
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    } catch (_) {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const gender = normalizeGender(body.gender);
    const weight = Number(body.weight);
    const height = Number(body.height);
    const goal = normalizeGoal(body.goal);
    const ingredients = Array.isArray(body.ingredients) ? body.ingredients : [];

    if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(height) || height <= 0) {
        return res.status(400).json({ error: 'Valid weight and height are required' });
    }

    let macros;
    try {
        const predictRes = await fetch(`${BACKEND_URL}/predict-diet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gender, weight, height, goal }),
        });
        if (!predictRes.ok) {
            const errText = await predictRes.text();
            console.error('Predict-diet error:', predictRes.status, errText);
            return res.status(502).json({ error: 'Diet backend is not available.' });
        }
        macros = await predictRes.json();
    } catch (err) {
        console.error('Diet generate fetch error:', err);
        return res.status(502).json({ error: 'Diet backend is not available.' });
    }

    const plan = buildMealPlan(ingredients, {
        totalCalories: macros.totalCalories,
        protein: macros.protein,
        carbs: macros.carbs,
        fats: macros.fats,
    });

    return res.status(200).json(plan);
}
