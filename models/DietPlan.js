import mongoose from 'mongoose';

const MacrosSchema = new mongoose.Schema({
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fats: { type: Number, default: 0 },
}, { _id: false });

const DietPlanSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [String], default: [] },
    dietPlan: {
        breakfast: { type: String, default: '' },
        lunch: { type: String, default: '' },
        dinner: { type: String, default: '' },
        totalCalories: { type: Number, default: 0 },
        macros: MacrosSchema,
    },
}, { timestamps: true });

const DietPlan = mongoose.models.DietPlan || mongoose.model('DietPlan', DietPlanSchema);
export default DietPlan;
