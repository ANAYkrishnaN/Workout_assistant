import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Utensils, User, Target, Scale, Ruler, TrendingUp, Loader2, RefreshCw, AlertCircle, Flame, Beef, Upload, Refrigerator, Trash2, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import { useLoading } from '@/context/LoadingContext';
import PrimaryButton from '@/components/ui/PrimaryButton';

const DietPlanner = () => {
    const { showLoader, hideLoader } = useLoading();
    const [loading, setLoading] = useState(false);
    const [loadingUser, setLoadingUser] = useState(true);
    const [availableOptions, setAvailableOptions] = useState(null);
    const [formData, setFormData] = useState({
        gender: '',
        goal: '',
        weight_kg: '',
        height_cm: ''
    });
    const [result, setResult] = useState(null);
    const [userId, setUserId] = useState(null);

    // Optional fridge: image upload + YOLO detection + editable ingredients
    const [fridgeFile, setFridgeFile] = useState(null);
    const [fridgePreview, setFridgePreview] = useState(null);
    const [analyzingFridge, setAnalyzingFridge] = useState(false);
    const [ingredients, setIngredients] = useState([]);
    const [customIngredient, setCustomIngredient] = useState('');
    const [dietError, setDietError] = useState('');
    const fileInputRef = useRef(null);

    // Workout Today (sent to hydration backend; synced to localStorage)
    const [workoutIntensity, setWorkoutIntensity] = useState(() => {
        if (typeof window === 'undefined') return 'none';
        return localStorage.getItem('hydration_workout_intensity') || 'none';
    });


    // Goal mapping from user data to diet API
    const goalMapping = {
        'Muscle Gain': 'Build Muscle',
        'Weight Loss': 'Lose Weight',
        'General Fitness': 'Get Fit',
        'Endurance': 'Improve Endurance',
        'Strength': 'Build Muscle',
        'Flexibility': 'Get Fit'
    };

    // Fetch user data and available options on mount
    useEffect(() => {
        fetchUserData();
        fetchOptions();
    }, []);

    const fetchUserData = async () => {
        try {
            setLoadingUser(true);
            const storedUser = localStorage.getItem('user');

            if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
                try {
                    const parsedUser = JSON.parse(storedUser);

                    // Pre-fill form with initial user data
                    setFormData(prev => ({
                        ...prev,
                        gender: parsedUser.personalDetails?.gender || prev.gender,
                        goal: goalMapping[parsedUser.personalDetails?.fitnessGoal] || prev.goal,
                        weight_kg: parsedUser.personalDetails?.currentWeight || prev.weight_kg,
                        height_cm: parsedUser.personalDetails?.height || prev.height_cm
                    }));

                    if (parsedUser._id) {
                        setUserId(parsedUser._id);
                        const res = await fetch(`/api/users/me?userId=${parsedUser._id}`);
                        const data = await res.json();

                        if (data.success) {
                            const user = data.user;
                            localStorage.setItem('user', JSON.stringify(user));

                            // Update form with fresh user data
                            setFormData(prev => ({
                                ...prev,
                                gender: user.personalDetails?.gender || prev.gender,
                                goal: goalMapping[user.personalDetails?.fitnessGoal] || prev.goal,
                                weight_kg: user.personalDetails?.currentWeight || prev.weight_kg,
                                height_cm: user.personalDetails?.height || prev.height_cm
                            }));
                        }
                    }
                } catch (parseError) {
                    console.error('Error parsing user data:', parseError);
                    localStorage.removeItem('user');
                }
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setLoadingUser(false);
        }
    };

    const fetchOptions = async () => {
        setAvailableOptions({
            genders: ['Male', 'Female'],
            goals: ['Weight Loss', 'Build Muscle', 'Get Fit', 'General Fitness', 'Maintenance', 'Muscle Gain'],
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleWorkoutIntensityChange = (e) => {
        const value = e.target.value;
        setWorkoutIntensity(value);
        try {
            localStorage.setItem('hydration_workout_intensity', value);
        } catch (_) {}
    };

    const handleFridgeFileChange = (e) => {
        const chosen = e.target.files?.[0];
        setDietError('');
        if (!chosen) return;
        if (!chosen.type.startsWith('image/')) {
            setDietError('Please select an image file (JPEG, PNG, etc.)');
            return;
        }
        setFridgeFile(chosen);
        setFridgePreview(URL.createObjectURL(chosen));
    };

    const handleAnalyzeFridge = async () => {
        console.log("Analyze clicked");

        if (!fridgeFile) {
            console.log("No file selected");
            setDietError('Please upload an image first');
            return;
        }

        const detectionApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        console.log("Calling:", `${detectionApiUrl}/detect`);

        setDietError('');
        setAnalyzingFridge(true);
        showLoader('Analyzing your fridge image...');

        try {
            const formData = new FormData();
            formData.append("file", fridgeFile);  // ✅ must match backend param

            const res = await fetch(`${detectionApiUrl}/detect`, {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error('Food detection service is not available.');
            const data = await res.json().catch(() => ([]));
            setIngredients(Array.isArray(data) ? data : []);
        } catch (err) {
            setDietError(err?.message === 'Failed to fetch' || !err?.message ? 'Food detection service is not available.' : err.message);
            setIngredients([]);
        } finally {
            setAnalyzingFridge(false);
            hideLoader();
        }
    };

    const removeIngredient = (index) => {
        setIngredients(prev => prev.filter((_, i) => i !== index));
        setDietError('');
    };

    const addCustomIngredient = () => {
        const name = customIngredient.trim().toLowerCase();
        if (!name) return;
        setIngredients(prev => (prev.includes(name) ? prev : [...prev, name]));
        setCustomIngredient('');
        setDietError('');
    };

    const handleSubmit = async () => {
        // Validation
        if (!formData.gender || !formData.goal || !formData.weight_kg || !formData.height_cm) {
            toast.info('Please fill in all fields');
            return;
        }

        if (formData.weight_kg <= 0 || formData.height_cm <= 0) {
            toast.info('Please enter valid weight and height');
            return;
        }

        setLoading(true);
        showLoader('Generating your diet plan...');

        try {
            const response = await fetch('/api/diet/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gender: formData.gender,
                    weight: parseFloat(formData.weight_kg),
                    height: parseFloat(formData.height_cm),
                    goal: formData.goal,
                    ingredients: ingredients,
                }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Diet backend is not available.');
            }

            const data = await response.json();
            const weight = parseFloat(formData.weight_kg);
            const height = parseFloat(formData.height_cm);
            const bmi = height > 0 ? (weight / ((height / 100) ** 2)).toFixed(1) : '';
            const bmiNum = parseFloat(bmi);
            const bmi_category = bmiNum < 18.5 ? 'Underweight' : bmiNum < 25 ? 'Normal' : bmiNum < 30 ? 'Overweight' : 'Obese';
            const meal_plan_details = `Breakfast: ${data.breakfast || ''} | Lunch: ${data.lunch || ''} | Dinner: ${data.dinner || ''}`;
            const meals = [
                { type: 'Breakfast', emoji: '🌅', text: data.breakfast || '' },
                { type: 'Lunch', emoji: '☀️', text: data.lunch || '' },
                { type: 'Dinner', emoji: '🌙', text: data.dinner || '' },
            ];
            setResult({
                gender: formData.gender,
                goal: formData.goal,
                bmi,
                bmi_category,
                meal_plan_category: 'ML-based plan',
                calories: data.totalCalories ?? 0,
                protein: data.macros?.protein ?? 0,
                carbs: data.macros?.carbs ?? 0,
                fats: data.macros?.fats ?? 0,
                meal_plan_details,
                meals,
                ingredientsUsed: [...ingredients],
            });
            toast.success('Diet plan generated successfully! 🎉');
        } catch (err) {
            toast.error(err.message || 'Failed to generate diet plan');
            setDietError(err.message || '');
            console.error('Diet plan error:', err);
        } finally {
            setLoading(false);
            hideLoader();
        }
    };

    const handleReset = () => {
        setFormData({
            gender: '',
            goal: '',
            weight_kg: '',
            height_cm: ''
        });
        setResult(null);
        setIngredients([]);
        setFridgeFile(null);
        setFridgePreview(null);
        setCustomIngredient('');
        setDietError('');
        fetchUserData();
    };

    const getBMIColor = (bmi) => {
        if (bmi < 18.5) return 'text-blue-600';
        if (bmi < 25) return 'text-green-600';
        if (bmi < 30) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getBMIBadge = (category) => {
        const colors = {
            'Underweight': 'bg-blue-100 text-blue-800',
            'Normal': 'bg-green-100 text-green-800',
            'Overweight': 'bg-yellow-100 text-yellow-800',
            'Obese': 'bg-red-100 text-red-800'
        };
        return colors[category] || 'bg-gray-100 text-gray-800';
    };

    if (loadingUser) {
        return (
            <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-white rounded-2xl shadow-sm p-12 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                        <span className="ml-3 text-gray-600">Loading your profile...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center">
                            <Utensils className="w-6 h-6 text-white" />
                        </div>
                        Diet Planner
                    </h2>
                    <p className="text-gray-600 mt-2 ml-13">Personalized meal plans based on your goals 🍎</p>
                </div>

                {/* Form */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 transition-shadow duration-200 hover:shadow-md">
                    <div className="space-y-6">
                        {/* Gender and Goal */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    Gender
                                </label>
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleInputChange}
                                    disabled={loading}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-gray-50 text-gray-700 bg-white transition-[border-color,box-shadow] duration-200"
                                >
                                    <option value="">Select Gender</option>
                                    {availableOptions?.genders?.map((gender) => (
                                        <option key={gender} value={gender}>{gender}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <Target className="w-4 h-4" />
                                    Fitness Goal
                                </label>
                                <select
                                    name="goal"
                                    value={formData.goal}
                                    onChange={handleInputChange}
                                    disabled={loading}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-gray-50 text-gray-700 bg-white transition-[border-color,box-shadow] duration-200"
                                >
                                    <option value="">Select Goal</option>
                                    {availableOptions?.goals?.map((goal) => (
                                        <option key={goal} value={goal}>{goal}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Weight and Height */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <Scale className="w-4 h-4" />
                                    Weight (kg)
                                </label>
                                <input
                                    type="number"
                                    name="weight_kg"
                                    value={formData.weight_kg}
                                    onChange={handleInputChange}
                                    disabled={loading}
                                    step="0.1"
                                    min="1"
                                    placeholder="Enter your weight"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-gray-50 text-gray-700 bg-white transition-[border-color,box-shadow] duration-200"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <Ruler className="w-4 h-4" />
                                    Height (cm)
                                </label>
                                <input
                                    type="number"
                                    name="height_cm"
                                    value={formData.height_cm}
                                    onChange={handleInputChange}
                                    disabled={loading}
                                    step="0.1"
                                    min="1"
                                    placeholder="Enter your height"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-gray-50 text-gray-700 bg-white transition-[border-color,box-shadow] duration-200"
                                />
                            </div>
                        </div>

                        {/* Workout Today (used by Hydration backend) */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <Target className="w-4 h-4" />
                                Workout Today
                            </label>
                            <select
                                name="workoutIntensity"
                                value={workoutIntensity}
                                onChange={handleWorkoutIntensityChange}
                                disabled={loading}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-gray-50 text-gray-700 bg-white transition-[border-color,box-shadow] duration-200"
                            >
                                <option value="none">None</option>
                                <option value="light">Light (30 min)</option>
                                <option value="moderate">Moderate (60 min)</option>
                                <option value="intense">Intense (90+ min)</option>
                            </select>
                        </div>

                        {/* Optional: Fridge image + ingredients */}
                        <div className="border-t border-gray-100 pt-6">
                            <h3 className="text-sm font-medium text-gray-700 mb-3">Optional: Fridge image</h3>
                            <div className="flex flex-col sm:flex-row gap-4 items-start flex-wrap">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFridgeFileChange}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-cyan-500 hover:text-cyan-600 transition-colors disabled:opacity-50"
                                >
                                    <Upload className="w-5 h-5" />
                                    Choose image
                                </button>
                                {fridgePreview && (
                                    <div className="w-32 h-24 rounded-xl overflow-hidden bg-gray-200 border border-gray-200">
                                        <img src={fridgePreview} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <PrimaryButton
                                    type="button"
                                    onClick={handleAnalyzeFridge}
                                    disabled={!fridgeFile || loading}
                                    loading={analyzingFridge}
                                    className="flex items-center gap-2 px-5 py-3 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 shadow-sm"
                                >
                                    <Refrigerator className="w-5 h-5" />
                                    Analyze
                                </PrimaryButton>
                            </div>
                            <div className="mt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">Ingredients</span>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={customIngredient}
                                            onChange={(e) => setCustomIngredient(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addCustomIngredient()}
                                            placeholder="Add item..."
                                            disabled={loading}
                                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-32 focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-gray-50"
                                        />
                                        <button
                                            type="button"
                                            onClick={addCustomIngredient}
                                            disabled={loading}
                                            className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add
                                        </button>
                                    </div>
                                </div>
                                {ingredients.length === 0 ? (
                                    <p className="text-gray-500 text-sm">Upload an image and click Analyze, or add items above.</p>
                                ) : (
                                    <ul className="flex flex-wrap gap-2">
                                        {ingredients.map((item, index) => (
                                            <li
                                                key={`${item}-${index}`}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-cyan-50 text-cyan-800 rounded-lg text-sm"
                                            >
                                                <span className="capitalize">{item}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeIngredient(index)}
                                                    disabled={loading}
                                                    className="p-0.5 rounded hover:bg-cyan-200 text-cyan-700 disabled:opacity-50"
                                                    aria-label={`Remove ${item}`}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {dietError && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                                {dietError}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-4">
                            <PrimaryButton
                                onClick={handleSubmit}
                                disabled={loading}
                                loading={loading}
                                className="flex-1 py-3 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 flex items-center justify-center gap-2 shadow-sm"
                            >
                                <TrendingUp className="w-5 h-5" />
                                Generate Diet Plan
                            </PrimaryButton>

                            {result && (
                                <motion.button
                                    type="button"
                                    onClick={handleReset}
                                    whileTap={{ scale: 0.97 }}
                                    className="py-3 px-6 border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center gap-2"
                                >
                                    <RefreshCw className="w-5 h-5" />
                                    Reset
                                </motion.button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Results */}
                {result && (
                    <motion.div
                        className="space-y-6"
                        initial="hidden"
                        animate="visible"
                        variants={{
                            visible: { transition: { staggerChildren: 0.08 } },
                            hidden: {},
                        }}
                    >
                        {/* BMI and Stats Card */}
                        <motion.div
                            className="bg-white rounded-2xl p-6 shadow-sm transition-shadow duration-200 hover:shadow-md"
                            variants={{
                                hidden: { opacity: 0, y: 20 },
                                visible: { opacity: 1, y: 0 },
                            }}
                            transition={{ duration: 0.25 }}
                        >
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-cyan-500" />
                                Your Health Metrics
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl transition-colors duration-200">
                                    <div className="text-sm text-gray-600 mb-1">Gender</div>
                                    <div className="text-xl font-bold text-gray-800">{result.gender}</div>
                                </div>
                                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl transition-colors duration-200">
                                    <div className="text-sm text-gray-600 mb-1">Goal</div>
                                    <div className="text-lg font-bold text-gray-800">{result.goal}</div>
                                </div>
                                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl transition-colors duration-200">
                                    <div className="text-sm text-gray-600 mb-1">BMI</div>
                                    <div className={`text-2xl font-bold ${getBMIColor(result.bmi)}`}>
                                        {result.bmi}
                                    </div>
                                </div>
                                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl transition-colors duration-200">
                                    <div className="text-sm text-gray-600 mb-1">Category</div>
                                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getBMIBadge(result.bmi_category)}`}>
                                        {result.bmi_category}
                                    </span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Plan Category & Macros Card */}
                        <motion.div
                            className="bg-white rounded-2xl p-6 shadow-sm transition-shadow duration-200 hover:shadow-md"
                            variants={{
                                hidden: { opacity: 0, y: 20 },
                                visible: { opacity: 1, y: 0 },
                            }}
                            transition={{ duration: 0.25 }}
                        >
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                Diet Plan Category
                            </h3>
                            <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl p-6 mb-4">
                                <div className="text-2xl font-bold mb-2">{result.meal_plan_category}</div>
                                <div className="flex flex-wrap items-center gap-6 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Flame className="w-5 h-5" />
                                        <span className="font-semibold">{result.calories} cal</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Beef className="w-5 h-5" />
                                        <span className="font-semibold">{result.protein}g protein</span>
                                    </div>
                                    {result.carbs != null && (
                                        <div className="flex items-center gap-2">
                                        <span className="font-semibold">{result.carbs}g carbs</span>
                                        </div>
                                    )}
                                    {result.fats != null && (
                                        <div className="flex items-center gap-2">
                                        <span className="font-semibold">{result.fats}g fats</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>

                        {/* Meal Plan – Styled recipe cards */}
                        <motion.div
                            className="bg-white rounded-2xl p-6 shadow-sm transition-shadow duration-200 hover:shadow-md"
                            variants={{
                                hidden: { opacity: 0, y: 20 },
                                visible: { opacity: 1, y: 0 },
                            }}
                            transition={{ duration: 0.25 }}
                        >
                            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <Utensils className="w-6 h-6 text-cyan-500" />
                                Your Personalized Meal Plan
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {(result.meals || []).map((meal, idx) => (
                                    <motion.div
                                        key={`${meal.type}-${idx}`}
                                        className="rounded-xl p-5 bg-gradient-to-br from-slate-50 to-cyan-50/50 border border-cyan-100 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                                        variants={{
                                            hidden: { opacity: 0, y: 20 },
                                            visible: { opacity: 1, y: 0 },
                                        }}
                                        transition={{ duration: 0.25, delay: idx * 0.06 }}
                                    >
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-2xl" aria-hidden>{meal.emoji}</span>
                                            <h4 className="font-bold text-gray-900">{meal.type}</h4>
                                        </div>
                                        <p className="text-gray-700 text-sm leading-relaxed mb-3">{meal.text}</p>
                                        {result.ingredientsUsed?.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mb-3">
                                                {result.ingredientsUsed.map((ing, i) => (
                                                    <span
                                                        key={`${ing}-${i}`}
                                                        className="px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800"
                                                    >
                                                        {ing}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <div className="flex flex-wrap gap-2 text-xs">
                                            <span className="px-2 py-1 rounded-lg bg-amber-100 text-amber-800 font-medium">Protein</span>
                                            <span className="px-2 py-1 rounded-lg bg-blue-100 text-blue-800 font-medium">Carbs</span>
                                            <span className="px-2 py-1 rounded-lg bg-rose-100 text-rose-800 font-medium">Calories</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Fallback: legacy meal_plan_details if no meals array */}
                            {(!result.meals || result.meals.length === 0) && result.meal_plan_details && (
                                <div className="mt-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-cyan-100">
                                    <div className="space-y-3 text-gray-700">
                                        {result.meal_plan_details.split('|').map((section, idx) => {
                                            const trimmed = section.trim();
                                            if (!trimmed) return null;
                                            return (
                                                <div key={idx} className="leading-relaxed font-medium">{trimmed}</div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Info Alert */}
                            <div className="mt-6 flex items-start gap-3 p-4 bg-cyan-50 border border-cyan-100 rounded-xl">
                                <AlertCircle className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
                                <div className="text-sm text-cyan-900">
                                    <p className="font-medium mb-1">Important Note:</p>
                                    <p>This meal plan is AI-generated and should be used as a general guide. Please consult with a registered dietitian or nutritionist for personalized nutrition advice tailored to your specific health needs and conditions.</p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default DietPlanner;