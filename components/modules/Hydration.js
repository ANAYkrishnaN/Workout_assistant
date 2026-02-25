import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";

const STORAGE_KEY = "hydration_history_dataset";

// Format date as YYYY-MM-DD
const getDayKey = (d = new Date()) => d.toISOString().slice(0, 10);

// Base interval based only on workout intensity (used as fallback)
const getBaseInterval = (intensity) => {
    const intervals = {
        light: 60,
        moderate: 45,
        intense: 30,
    };
    return intervals[intensity] || 45;
};

// Workout goal mapping
const goalMapping = {
    "Build Muscle": "Build Muscle",
    "Lose Weight": "Lose Weight",
    "Get Fit": "Get Fit",
    "Improve Endurance": "Improve Endurance"
};

// Simple decision logic for AI tips
const inferHydrationDecision = (avgPercent, intensity) => {
    if (avgPercent < 50) {
        return { tipText: "You're falling behind! Try setting reminders and keeping water nearby." };
    } else if (avgPercent < 80) {
        return { tipText: "Good progress! Stay consistent with your hydration schedule." };
    } else {
        return { tipText: "Excellent hydration habits! Keep up the great work!" };
    }
};

const Hydration = () => {
    // User data from database
    const [userId, setUserId] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);

    // Hydration state
    const [waterIntake, setWaterIntake] = useState(0);
    const [dailyGoal, setDailyGoal] = useState(2500);
    const [lastDrinkTime, setLastDrinkTime] = useState(null);
    const [notifications, setNotifications] = useState(true);
    const [workoutIntensity, setWorkoutIntensity] = useState("moderate");

    // ML input fields
    const [mlInputs, setMlInputs] = useState({
        age: "",
        weight: "",
        height: "",
        humidity: "",
        temperature: "",
        workout_goal: "",
        season: "",
    });

    // Weather data
    const [weatherData, setWeatherData] = useState(null);
    const [fetchingWeather, setFetchingWeather] = useState(false);
    const [weatherError, setWeatherError] = useState(null);
    const [locationData, setLocationData] = useState(null);

    // ML prediction result
    const [mlPrediction, setMlPrediction] = useState(null);
    const [predictingML, setPredictingML] = useState(false);

    const [history, setHistory] = useState([]);
    const [aiTip, setAiTip] = useState("Stay hydrated throughout the day!");

    // Get current season based on month
    const getCurrentSeason = () => {
        const month = new Date().getMonth() + 1;
        if (month >= 3 && month <= 5) return "Spring";
        if (month >= 6 && month <= 8) return "Summer";
        if (month >= 9 && month <= 11) return "Autumn";
        return "Winter";
    };

    // Get user's location using Geolocation API
    const getUserLocation = async () => {
        if (!navigator.geolocation) {
            throw new Error("Geolocation is not supported by your browser");
        }

        if (navigator.permissions) {
            try {
                const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });

                if (permissionStatus.state === 'denied') {
                    throw new Error("Location permission denied. Please enable location access in your browser settings.");
                }
            } catch (permError) {
                console.warn('Permissions API check failed:', permError);
            }
        }

        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log('Location obtained:', position.coords);
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    let errorMessage = "Unable to get location";

                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = "Location permission denied. Please enable location in your browser settings.";
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = "Location information unavailable. Please try again.";
                            break;
                        case error.TIMEOUT:
                            errorMessage = "Location request timed out. Please try again.";
                            break;
                        default:
                            errorMessage = `Location error: ${error.message}`;
                    }

                    reject(new Error(errorMessage));
                },
                {
                    enableHighAccuracy: false,
                    timeout: 10000,
                    maximumAge: 300000
                }
            );
        });
    };

    // Fetch weather data from Open-Meteo API
    const fetchWeatherData = async () => {
        setFetchingWeather(true);
        setWeatherError(null);

        try {
            const location = await getUserLocation();
            setLocationData(location);

            const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m&timezone=auto`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Failed to fetch weather data');
            }

            const data = await response.json();

            const currentWeather = {
                temperature: Math.round(data.current.temperature_2m),
                humidity: Math.round(data.current.relative_humidity_2m),
                season: getCurrentSeason(),
                latitude: data.latitude,
                longitude: data.longitude,
            };

            setWeatherData(currentWeather);

            setMlInputs((prev) => ({
                ...prev,
                temperature: currentWeather.temperature,
                humidity: currentWeather.humidity,
                season: currentWeather.season,
            }));

        } catch (error) {
            console.error("Error fetching weather:", error);
            setWeatherError(error.message);
        } finally {
            setFetchingWeather(false);
        }
    };

    // Fetch user data from localStorage and API on mount
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                setLoadingUser(true);
                const storedUser = localStorage.getItem('user');

                if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
                    try {
                        const parsedUser = JSON.parse(storedUser);

                        // Pre-fill ML inputs with initial user data
                        setMlInputs(prev => ({
                            ...prev,
                            age: parsedUser.personalDetails?.age || "",
                            weight: parsedUser.personalDetails?.currentWeight || "",
                            height: parsedUser.personalDetails?.height || "",
                            workout_goal: goalMapping[parsedUser.fitnessGoals?.primaryGoal] || "",
                        }));

                        // Set hydration preferences from user data
                        if (parsedUser.hydration) {
                            setDailyGoal(parsedUser.hydration.dailyGoal || 2500);
                            setWaterIntake(parsedUser.hydration.currentProgress || 0);
                            setWorkoutIntensity(parsedUser.hydration.workoutIntensity || "moderate");
                            setNotifications(parsedUser.hydration.reminder || false);
                        }

                        if (parsedUser._id) {
                            setUserId(parsedUser._id);

                            // Fetch latest hydration data from API
                            try {
                                const response = await fetch(`/api/user/me?userId=${parsedUser._id}`);
                                if (response.ok) {
                                    const { user } = await response.json();
                                    if (user && user.hydration) {
                                        setWaterIntake(user.hydration.currentProgress || 0);
                                        setDailyGoal(user.hydration.dailyGoal || 2500);
                                        setWorkoutIntensity(user.hydration.workoutIntensity || "moderate");
                                        setNotifications(user.hydration.reminder || false);

                                        // Update localStorage with latest data
                                        localStorage.setItem('user', JSON.stringify(user));
                                    }
                                }
                            } catch (apiError) {
                                console.error('Error fetching user from API:', apiError);
                                // Continue with localStorage data if API fails
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

        fetchUserData();
    }, []);

    // Predict hydration using ML model
    const predictHydration = async () => {
        const required = ["age", "weight", "height", "humidity", "temperature", "workout_goal", "season"];
        const missing = required.filter((field) => !mlInputs[field]);
        if (missing.length > 0) {
            toast.info(`Please fill in all required fields: ${missing.join(", ")}`);
            return;
        }
        setPredictingML(true);
        try {
            // Call ML prediction API
            const mlResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/hydration/predict`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    age: parseInt(mlInputs.age),
                    weight: parseInt(mlInputs.weight),
                    height: parseInt(mlInputs.height),
                    humidity: parseInt(mlInputs.humidity),
                    temperature: parseInt(mlInputs.temperature),
                    workout_goal: mlInputs.workout_goal,
                    season: mlInputs.season
                }),
            });

            if (!mlResponse.ok) {
                throw new Error('ML prediction failed');
            }

            const prediction = await mlResponse.json();

            setMlPrediction(prediction);
            setDailyGoal(prediction.recommended_intake_ml);

            // Update API if user exists
            if (userId) {
                try {
                    const updateResponse = await fetch('/api/update-hydration', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            userId,
                            dailyGoal: prediction.recommended_intake_ml,
                        }),
                    });
                    if (updateResponse.ok) {
                        const { user } = await updateResponse.json();
                        localStorage.setItem('user', JSON.stringify(user));
                        console.log('Daily goal synced with database');
                    }
                } catch (syncError) {
                    console.error('Error syncing daily goal:', syncError);
                }
            }
        } catch (error) {
            console.error("Error predicting hydration:", error);
            toast.info("Error calculating hydration recommendation.");
        } finally {
            setPredictingML(false);
        }
    };

    // Load history from memory
    useEffect(() => {
        const todayKey = getDayKey();
        setHistory([{
            date: todayKey,
            totalMl: waterIntake,
            goalMl: dailyGoal,
        }]);
    }, [waterIntake, dailyGoal]);

    // AI adaptive tip
    useEffect(() => {
        if (!history.length) {
            setAiTip("Start logging your water intake to get personalized tips.");
            return;
        }

        const percents = history.map((d) =>
            d.goalMl ? (d.totalMl / d.goalMl) * 100 : 0
        );
        const avgPercent =
            percents.reduce((sum, p) => sum + p, 0) / (percents.length || 1);

        const decision = inferHydrationDecision(avgPercent, workoutIntensity);
        setAiTip(decision.tipText);
    }, [history, workoutIntensity]);

    // Check if it's time to drink water
    useEffect(() => {
        if (!notifications || !lastDrinkTime) return;
        if (typeof window === "undefined" || !("Notification" in window)) return;

        const adaptiveInterval = getBaseInterval(workoutIntensity);

        const interval = setInterval(() => {
            const now = Date.now();
            const timeSinceLastDrink = (now - lastDrinkTime) / 1000 / 60;

            if (
                timeSinceLastDrink >= adaptiveInterval &&
                waterIntake < dailyGoal &&
                Notification.permission === "granted"
            ) {
                new Notification("Time to Hydrate! 💧", {
                    body: `It's been ${Math.round(
                        timeSinceLastDrink
                    )} minutes. Drink some water!`,
                });
            }
        }, 60000);

        return () => clearInterval(interval);
    }, [lastDrinkTime, notifications, waterIntake, dailyGoal, workoutIntensity]);

    const requestNotificationPermission = () => {
        if (typeof window === "undefined") return;
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    };

    const addWater = async (amount) => {
        const newIntake = Math.min(waterIntake + amount, dailyGoal);
        setWaterIntake(newIntake);
        setLastDrinkTime(Date.now());

        // Sync with API if user is logged in
        if (userId) {
            try {
                const response = await fetch('/api/update-hydration', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userId,
                        currentProgress: newIntake,
                    }),
                });

                if (response.ok) {
                    const { user } = await response.json();
                    localStorage.setItem('user', JSON.stringify(user));
                    console.log('Hydration synced with database');
                } else {
                    console.error('Failed to sync hydration with database');
                }
            } catch (error) {
                console.error('Error syncing hydration:', error);
            }
        }
    };

    const resetDaily = async () => {
        setWaterIntake(0);
        setLastDrinkTime(null);

        // Sync reset with API if user is logged in
        if (userId) {
            try {
                const response = await fetch('/api/update-hydration', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userId,
                        currentProgress: 0,
                    }),
                });

                if (response.ok) {
                    const { user } = await response.json();
                    localStorage.setItem('user', JSON.stringify(user));
                    console.log('Hydration reset synced with database');
                }
            } catch (error) {
                console.error('Error syncing reset:', error);
            }
        }
    };

    const handleInputChange = (field, value) => {
        setMlInputs((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const progress = (waterIntake / dailyGoal) * 100;
    const cupsConsumed = Math.floor(waterIntake / 250);
    const cupsRemaining = Math.ceil((dailyGoal - waterIntake) / 250);

    if (loadingUser) {
        return (
            <div className="bg-white rounded-2xl p-8 shadow-lg max-w-4xl mx-auto">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-linear-to-br from-blue-50 to-cyan-50 min-h-screen p-6">
            <div className="bg-white rounded-2xl p-8 shadow-lg max-w-8xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-800">
                        Hydration Tracker 💧
                    </h3>
                    <button
                        onClick={resetDaily}
                        className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
                    >
                        Reset Daily
                    </button>
                </div>

                {/* ML Prediction Section */}
                <div className="mb-8 bg-linear-to-br from-purple-50 to-blue-50 rounded-xl p-6">
                    <h4 className="text-lg font-bold text-gray-800 mb-4">
                        🤖 AI-Powered Hydration Calculator
                    </h4>

                    {/* Weather Data Section */}
                    <div className="mb-4 p-4 bg-white rounded-lg shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-semibold text-gray-700">
                                🌤️ Real-Time Weather Data
                            </span>
                            <button
                                onClick={fetchWeatherData}
                                disabled={fetchingWeather}
                                className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                            >
                                {fetchingWeather ? "Fetching..." : "Get Weather"}
                            </button>
                        </div>

                        {!weatherData && !fetchingWeather && !weatherError && (
                            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-xs text-blue-700 mb-1">
                                    📍 Click &quot;Get Weather&quot; to auto-fill temperature and humidity
                                </p>
                                <p className="text-xs text-blue-600">
                                    You&apos;ll be asked to allow location access for accurate weather data.
                                </p>
                            </div>
                        )}

                        {weatherError && (
                            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-xs text-red-700 font-semibold mb-1">
                                    ⚠️ {weatherError}
                                </p>
                                <p className="text-xs text-red-600 mt-2">
                                    You can manually enter temperature and humidity below.
                                </p>
                            </div>
                        )}

                        {weatherData && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-2 bg-linear-to-r from-orange-50 to-red-50 rounded-lg">
                                    <span className="text-sm text-gray-700">🌡️ Temperature</span>
                                    <span className="text-lg font-bold text-orange-600">
                                        {weatherData.temperature}°C
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-linear-to-r from-blue-50 to-cyan-50 rounded-lg">
                                    <span className="text-sm text-gray-700">💧 Humidity</span>
                                    <span className="text-lg font-bold text-blue-600">
                                        {weatherData.humidity}%
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-linear-to-r from-green-50 to-emerald-50 rounded-lg">
                                    <span className="text-sm text-gray-700">🍂 Season</span>
                                    <span className="text-lg font-bold text-green-600">
                                        {weatherData.season}
                                    </span>
                                </div>
                                {locationData && (
                                    <div className="text-xs text-gray-500 mt-2 text-center">
                                        📍 Location: {locationData.latitude.toFixed(2)}°N, {locationData.longitude.toFixed(2)}°E
                                    </div>
                                )}
                            </div>
                        )}

                        {!weatherData && !fetchingWeather && !weatherError && (
                            <p className="text-xs text-gray-500 text-center py-2">
                                Click &quot;Get Weather&quot; to fetch real-time data
                            </p>
                        )}
                    </div>

                    {/* ML Input Fields */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="text-xs text-gray-600 mb-1 block">Age (years)</label>
                            <input
                                type="number"
                                value={mlInputs.age}
                                onChange={(e) => handleInputChange("age", e.target.value)}
                                className="w-full text-gray-700 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="25"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-600 mb-1 block">Weight (kg)</label>
                            <input
                                type="number"
                                value={mlInputs.weight}
                                onChange={(e) => handleInputChange("weight", e.target.value)}
                                className="w-full text-gray-700 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="70"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-600 mb-1 block">Height (cm)</label>
                            <input
                                type="number"
                                value={mlInputs.height}
                                onChange={(e) => handleInputChange("height", e.target.value)}
                                className="w-full text-gray-700 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="175"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-600 mb-1 block">
                                Temperature (°C)
                            </label>
                            <input
                                type="number"
                                value={mlInputs.temperature}
                                onChange={(e) => handleInputChange("temperature", e.target.value)}
                                className="w-full text-gray-700 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="Auto from weather"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-600 mb-1 block">Humidity (%)</label>
                            <input
                                type="number"
                                value={mlInputs.humidity}
                                onChange={(e) => handleInputChange("humidity", e.target.value)}
                                className="w-full text-gray-700 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="Auto from weather"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-600 mb-1 block">Season</label>
                            <select
                                value={mlInputs.season}
                                onChange={(e) => handleInputChange("season", e.target.value)}
                                className="w-full text-gray-700 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">Select Season</option>
                                <option value="Spring">Spring</option>
                                <option value="Summer">Summer</option>
                                <option value="Autumn">Autumn</option>
                                <option value="Winter">Winter</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs text-gray-600 mb-1 block">Workout Goal</label>
                            <select
                                value={mlInputs.workout_goal}
                                onChange={(e) => handleInputChange("workout_goal", e.target.value)}
                                className="w-full text-gray-700 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">Select Workout Goal</option>
                                <option value="Build Muscle">Build Muscle</option>
                                <option value="Lose Weight">Lose Weight</option>
                                <option value="Get Fit">Get Fit</option>
                                <option value="Improve Endurance">Improve Endurance</option>
                            </select>
                        </div>
                    </div>

                    {/* Predict Button */}
                    <button
                        onClick={predictHydration}
                        disabled={predictingML}
                        className="w-full py-3 bg-linear-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-blue-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                    >
                        {predictingML ? "Calculating..." : "Calculate Optimal Hydration"}
                    </button>

                    {/* ML Prediction Result */}
                    {mlPrediction && (
                        <div className="mt-4 p-4 bg-white rounded-lg border-2 border-purple-300 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-gray-700">
                                    🎯 Recommended Daily Intake
                                </span>
                                <span className="text-2xl font-bold text-purple-600">
                                    {mlPrediction.recommended_intake_ml}ml
                                </span>
                            </div>
                            <p className="text-xs text-gray-600">
                                ≈ {mlPrediction.recommended_intake_liters}L or{" "}
                                {Math.round(mlPrediction.recommended_intake_ml / 250)} cups
                            </p>
                        </div>
                    )}
                </div>

                {/* Daily Goal Progress */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-600">
                            Daily Progress
                        </span>
                        <span className="text-sm font-bold text-cyan-600">
                            {waterIntake}ml / {dailyGoal}ml
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                        <div
                            className="bg-linear-to-r from-cyan-400 to-blue-500 h-4 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        {cupsConsumed} cups consumed • {cupsRemaining} cups remaining
                    </p>
                </div>

                {/* Quick Add Buttons */}
                <div className="mb-8">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Add</h4>
                    <div className="grid grid-cols-4 gap-3">
                        <button
                            onClick={() => addWater(250)}
                            className="bg-cyan-100 hover:bg-cyan-200 text-cyan-700 font-medium py-3 rounded-lg transition-colors"
                        >
                            <div className="text-lg mb-1">🥤</div>
                            <div className="text-xs">250ml</div>
                        </button>
                        <button
                            onClick={() => addWater(500)}
                            className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-3 rounded-lg transition-colors"
                        >
                            <div className="text-lg mb-1">🍶</div>
                            <div className="text-xs">500ml</div>
                        </button>
                        <button
                            onClick={() => addWater(750)}
                            className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-medium py-3 rounded-lg transition-colors"
                        >
                            <div className="text-lg mb-1">💧</div>
                            <div className="text-xs">750ml</div>
                        </button>
                        <button
                            onClick={() => addWater(1000)}
                            className="bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium py-3 rounded-lg transition-colors"
                        >
                            <div className="text-lg mb-1">🚰</div>
                            <div className="text-xs">1000ml</div>
                        </button>
                    </div>
                </div>

                {/* Settings */}
                <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Settings</h4>
                    <div className="space-y-3">
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">
                                Workout Intensity
                            </label>
                            <div className="relative">
                                <select
                                    value={workoutIntensity}
                                    onChange={(e) => setWorkoutIntensity(e.target.value)}
                                    className="w-full text-sm text-gray-700 px-4 py-3 pr-10 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white appearance-none cursor-pointer hover:border-gray-300 transition-colors"
                                >
                                    <option value="light">🌱 Light - Every 60 minutes</option>
                                    <option value="moderate">🔥 Moderate - Every 45 minutes</option>
                                    <option value="intense">⚡ Intense - Every 30 minutes</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 flex items-center">
                                <span className="inline-block w-2 h-2 rounded-full bg-cyan-500 mr-2"></span>
                                Reminder frequency adjusts based on intensity
                            </p>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Reminders</span>
                            <button
                                onClick={() => {
                                    setNotifications(!notifications);
                                    if (!notifications) {
                                        requestNotificationPermission();
                                    }
                                }}
                                className={`px-4 py-1 rounded-lg text-sm font-medium transition-colors ${notifications
                                    ? "bg-cyan-500 text-white"
                                    : "bg-gray-300 text-gray-700"
                                    }`}
                            >
                                {notifications ? "On" : "Off"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* AI Tip */}
                <div className="p-4 bg-linear-to-r from-cyan-50 to-blue-50 rounded-lg border-l-4 border-cyan-500">
                    <div className="flex items-start">
                        <span className="text-2xl mr-3">💡</span>
                        <div>
                            <h4 className="text-sm font-semibold text-gray-800 mb-1">
                                AI Hydration Tip
                            </h4>
                            <p className="text-sm text-gray-600">{aiTip}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Hydration;