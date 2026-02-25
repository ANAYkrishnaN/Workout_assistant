import mongoose from "mongoose";

const ExerciseSchema = new mongoose.Schema({
    name: { type: String, required: true },
    sets: { type: String, default: "" },
    reps: { type: String, default: "" },
    rest: { type: String, default: "" },
    notes: { type: String, default: "" },
    tempo: { type: String, default: "" }
}, { _id: false });

const WorkoutDaySchema = new mongoose.Schema({
    dayNumber: { type: Number, required: true }, // 1, 2, 3, 4, etc.
    dayName: { type: String, default: "" }, // "Monday", "Day 1", etc.
    focus: { type: String, default: "" }, // "Upper Body A", "Push", "Legs"
    duration: { type: Number, default: 0 }, // in minutes
    description: { type: String, default: "" },
    exercises: [ExerciseSchema],
    warmup: { type: String, default: "" },
    cooldown: { type: String, default: "" }
}, { _id: false });

const WorkoutPlanSchema = new mongoose.Schema({
    planName: { type: String, default: "" },
    generatedAt: { type: Date, default: Date.now },
    summary: { type: String, default: "" },
    fullPlan: { type: String, default: "" },
    structure: { type: String, default: "" },
    weeklySchedule: [WorkoutDaySchema], // Array of workout days
    restDays: { type: [Number], default: [] }, // Which days are rest [5, 6, 7]
    tips: { type: [String], default: [] }
}, { _id: false });

const UserSchema = new mongoose.Schema({
    login: {
        fullName: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
    },
    personalDetails: {
        age: { type: Number, default: null },
        gender: { type: String, default: "" },
        height: { type: Number, default: null },
        currentWeight: { type: Number, default: null },
        targetWeight: { type: Number, default: null },
    },
    fitnessGoals: {
        primaryGoal: { type: String, default: "" },
        fitnessLevel: { type: String, default: "" },
        availableEquipment: { type: [String], default: [] },
        injuries: { type: [String], default: [] },
    },
    schedule: {
        workoutDaysPerWeek: { type: Number, default: null },
        timePerWorkout: { type: Number, default: null },
    },
    workoutPlan: WorkoutPlanSchema,
    workoutHistory: [WorkoutPlanSchema],
    progress: {
        workoutsCompleted: { type: Number, default: 0 },
        caloriesBurned: { type: Number, default: 0 },
        achievements: { type: [String], default: [] },
        lastWorkoutDate: { type: Date, default: null },
        completedWorkouts: [{
            dayNumber: Number,
            completedAt: Date,
            notes: String
        }]
    },
    hydration: {
        dailyGoal: { type: Number, default: 2500 },
        currentProgress: { type: Number, default: 0 },
        workoutIntensity: { type: String, default: 'moderate' },
        notificationInterval: { type: Number, default: 45 },
        reminder: { type: Boolean, default: false },
    },
}, { timestamps: true, minimize: false });

UserSchema.set('toJSON', { minimize: false });
UserSchema.set('toObject', { minimize: false });

const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;