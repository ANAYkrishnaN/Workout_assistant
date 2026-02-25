import React, { useState, useEffect } from 'react';
import { Utensils, User, Target, Scale, Ruler, TrendingUp, Loader2, RefreshCw, AlertCircle, Flame, Beef } from 'lucide-react';
import { toast } from 'react-toastify';

const DietPlanner = () => {
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

    const API_URL = process.env.NEXT_PUBLIC_API_URL;

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
        try {
            const response = await fetch(`${API_URL}/diet/info`);
            if (response.ok) {
                const data = await response.json();
                setAvailableOptions(data);
            }
        } catch (err) {
            console.error('Failed to fetch diet options:', err);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
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

        try {
            const response = await fetch(`${API_URL}/diet/predict`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    gender: formData.gender,
                    goal: formData.goal,
                    weight_kg: parseFloat(formData.weight_kg),
                    height_cm: parseFloat(formData.height_cm)
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to get diet plan');
            }

            const data = await response.json();
            setResult(data);
            toast.success('Diet plan generated successfully! 🎉');
        } catch (err) {
            toast.error(err.message || 'Failed to generate diet plan');
            console.error('Diet plan error:', err);
        } finally {
            setLoading(false);
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
            <div className="w-full min-h-screen bg-linear-to-br from-blue-50 to-cyan-50 p-6">
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
        <div className="w-full min-h-screen bg-linear-to-br from-blue-50 to-cyan-50 p-6">
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
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
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
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-gray-50 text-gray-700 bg-white"
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
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-gray-50 text-gray-700 bg-white"
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
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-gray-50 text-gray-700 bg-white"
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
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-gray-50 text-gray-700 bg-white"
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4">
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-1 py-3 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <TrendingUp className="w-5 h-5" />
                                        Generate Diet Plan
                                    </>
                                )}
                            </button>

                            {result && (
                                <button
                                    onClick={handleReset}
                                    className="py-3 px-6 border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <RefreshCw className="w-5 h-5" />
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Results */}
                {result && (
                    <div className="space-y-6">
                        {/* BMI and Stats Card */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-cyan-500" />
                                Your Health Metrics
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-4 bg-linear-to-br from-blue-50 to-cyan-50 rounded-xl">
                                    <div className="text-sm text-gray-600 mb-1">Gender</div>
                                    <div className="text-xl font-bold text-gray-800">{result.gender}</div>
                                </div>
                                <div className="text-center p-4 bg-linear-to-br from-blue-50 to-cyan-50 rounded-xl">
                                    <div className="text-sm text-gray-600 mb-1">Goal</div>
                                    <div className="text-lg font-bold text-gray-800">{result.goal}</div>
                                </div>
                                <div className="text-center p-4 bg-linear-to-br from-blue-50 to-cyan-50 rounded-xl">
                                    <div className="text-sm text-gray-600 mb-1">BMI</div>
                                    <div className={`text-2xl font-bold ${getBMIColor(result.bmi)}`}>
                                        {result.bmi}
                                    </div>
                                </div>
                                <div className="text-center p-4 bg-linear-to-br from-blue-50 to-cyan-50 rounded-xl">
                                    <div className="text-sm text-gray-600 mb-1">Category</div>
                                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getBMIBadge(result.bmi_category)}`}>
                                        {result.bmi_category}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Plan Category & Macros Card */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                Diet Plan Category
                            </h3>
                            <div className="bg-linear-to-r from-cyan-500 to-blue-500 text-white rounded-xl p-6 mb-4">
                                <div className="text-2xl font-bold mb-2">{result.meal_plan_category}</div>
                                <div className="flex items-center gap-6 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Flame className="w-5 h-5" />
                                        <span className="font-semibold">{result.calories} cal</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Beef className="w-5 h-5" />
                                        <span className="font-semibold">{result.protein}g protein</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Meal Plan Card */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <Utensils className="w-6 h-6 text-cyan-500" />
                                Your Personalized Meal Plan
                            </h3>

                            {/* Parse and display meal plan */}
                            <div className="bg-linear-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-cyan-100">
                                <div className="space-y-3 text-gray-700">
                                    {result?.meal_plan_details?.split('|').map((section, idx) => {
                                        const trimmedSection = section.trim();

                                        // Skip empty sections
                                        if (!trimmedSection) return null;

                                        // Check if section starts with a meal title
                                        const mealMatch = trimmedSection.match(/^(Breakfast|Lunch|Dinner|Snack):/i);

                                        if (mealMatch) {
                                            const mealType = mealMatch[1];
                                            let mealIcon = '🍽️';

                                            if (mealType.toLowerCase() === 'breakfast') {
                                                mealIcon = '🌅';
                                            } else if (mealType.toLowerCase() === 'lunch') {
                                                mealIcon = '☀️';
                                            } else if (mealType.toLowerCase() === 'dinner') {
                                                mealIcon = '🌙';
                                            } else if (mealType.toLowerCase() === 'snack') {
                                                mealIcon = '🍎';
                                            }

                                            return (
                                                <div key={idx} className="leading-relaxed">
                                                    <span className="font-bold text-gray-900 flex items-center gap-2">
                                                        <span className="text-xl">{mealIcon}</span>
                                                        <span>{trimmedSection}</span>
                                                    </span>
                                                </div>
                                            );
                                        }

                                        // For Total line or other summary info
                                        if (trimmedSection.toLowerCase().includes('total:')) {
                                            return (
                                                <div key={idx} className="font-semibold text-gray-900 pt-2 border-t border-cyan-200 mt-2">
                                                    {trimmedSection}
                                                </div>
                                            );
                                        }

                                        // Regular content
                                        return (
                                            <div key={idx} className="leading-relaxed">
                                                {trimmedSection}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Info Alert */}
                            <div className="mt-6 flex items-start gap-3 p-4 bg-cyan-50 border border-cyan-100 rounded-xl">
                                <AlertCircle className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
                                <div className="text-sm text-cyan-900">
                                    <p className="font-medium mb-1">Important Note:</p>
                                    <p>This meal plan is AI-generated and should be used as a general guide. Please consult with a registered dietitian or nutritionist for personalized nutrition advice tailored to your specific health needs and conditions.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DietPlanner;