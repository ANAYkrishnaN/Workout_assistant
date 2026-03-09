import { connectDB } from '@/lib/mongodb';
import DietPlan from '@/models/DietPlan';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        await connectDB();
    } catch (err) {
        console.error('DB connection error:', err);
        return res.status(500).json({ error: 'Database unavailable' });
    }

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (_) {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const { userId, items, dietPlan } = body;
    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }
    if (!dietPlan || typeof dietPlan !== 'object') {
        return res.status(400).json({ error: 'dietPlan object is required' });
    }

    try {
        const doc = await DietPlan.create({
            userId,
            items: Array.isArray(items) ? items : [],
            dietPlan: {
                breakfast: dietPlan.breakfast || '',
                lunch: dietPlan.lunch || '',
                dinner: dietPlan.dinner || '',
                totalCalories: dietPlan.totalCalories ?? 0,
                macros: {
                    protein: dietPlan.macros?.protein ?? 0,
                    carbs: dietPlan.macros?.carbs ?? 0,
                    fats: dietPlan.macros?.fats ?? 0,
                },
            },
        });
        return res.status(200).json({ success: true, id: doc._id });
    } catch (err) {
        console.error('Save diet error:', err);
        return res.status(500).json({ error: 'Failed to save diet plan' });
    }
}
