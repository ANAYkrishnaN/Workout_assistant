'use client';

import { MessageCircle, Send, Loader2 } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createProfileSummary, processLine } from '@/utils/functions';
import { PROFILE_QUESTIONS, SYSTEM_INSTRUCTION, WORKOUT_SYSTEM_INSTRUCTION } from '@/utils/constants';

const Chatbot = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [checkingProfile, setCheckingProfile] = useState(true);

    const chatSessionRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const messagesEndRef = useRef(null);

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [collectingProfile, setCollectingProfile] = useState(false);
    const [profile, setProfile] = useState({});
    const [hasExistingProfile, setHasExistingProfile] = useState(false);

    const scrollToBottom = () => {
        setTimeout(() => {
            const container = messagesContainerRef.current;
            container?.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 0);
    };

    useEffect(() => {
        const init = async () => {
            try {
                // Initialize Gemini
                const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({
                    model: "gemini-flash-latest",
                    systemInstruction: collectingProfile ? SYSTEM_INSTRUCTION : WORKOUT_SYSTEM_INSTRUCTION
                });

                chatSessionRef.current = model.startChat({
                    history: [],
                    generationConfig: { maxOutputTokens: 3000, temperature: 0.7 }
                });

                // Check existing profile
                await checkExistingProfile();
            } catch (err) {
                console.error('Gemini init error', err);
                setCheckingProfile(false);
            }
        };
        init();
    }, []);

    const checkExistingProfile = async () => {
        try {
            const storedUserId = JSON.parse(localStorage.getItem('user'))._id;

            if (!storedUserId) {
                // No user logged in, start profile collection
                startProfileCollection();
                return;
            }

            const response = await fetch(`/api/users/me?userId=${storedUserId}`);
            const data = await response.json();

            if (!response.ok || !data.user) {
                startProfileCollection();
                return;
            }

            const user = data.user;

            // Check if essential profile data exists
            const hasPersonalDetails = user.personalDetails?.age &&
                user.personalDetails?.gender &&
                user.personalDetails?.currentWeight;

            const hasFitnessGoals = user.fitnessGoals?.primaryGoal &&
                user.fitnessGoals?.fitnessLevel;

            const hasSchedule = user.schedule?.workoutDaysPerWeek &&
                user.schedule?.timePerWorkout;

            if (hasPersonalDetails && hasFitnessGoals && hasSchedule) {
                // Profile exists, skip to assistant mode
                setHasExistingProfile(true);
                setCollectingProfile(false);
                setMessages([
                    {
                        role: 'assistant',
                        content: `Welcome back, ${user.login?.fullName || 'there'}! 👋\n\nI see you already have a profile set up. How can I help you today?\n\nYou can ask me about:\n- Workout advice and exercise tips\n- Nutrition guidance\n- Form corrections\n- Modifying your workout plan\n- Progress tracking tips\n- Any fitness-related questions`
                    }
                ]);
            } else {
                // Incomplete profile, collect missing data
                startProfileCollection();
            }
        } catch (error) {
            console.error('Error checking profile:', error);
            startProfileCollection();
        } finally {
            setCheckingProfile(false);
        }
    };

    const startProfileCollection = () => {
        setCollectingProfile(true);
        setMessages([
            { role: 'assistant', content: "Hello! I'm your AI fitness assistant. Before we begin, let's build your fitness profile." },
            { role: 'assistant', content: PROFILE_QUESTIONS[0].question }
        ]);
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const addMessage = (role, content) => {
        setMessages(prev => [...prev, { role, content }]);
    };

    const handleProfileAnswer = (answer) => {
        const currentKey = PROFILE_QUESTIONS[currentQuestionIndex].key;
        setProfile(prev => ({ ...prev, [currentKey]: answer }));

        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex < PROFILE_QUESTIONS.length) {
            setCurrentQuestionIndex(nextIndex);
            addMessage("assistant", PROFILE_QUESTIONS[nextIndex].question);
        } else {
            finishProfileAndRequestWorkoutPlan();
        }
    };

    const parseWorkoutPlan = (aiResponse, profile = {}) => {
        try {
            const workoutDays = [];
            const tips = [];

            // EXTRACT PLAN NAME
            const structureMatch = aiResponse.match(/##\s*(.+?)(?:\n|$)/);
            const structure = structureMatch ? structureMatch[1].trim() : "Custom Workout Plan";

            // EXTRACT SUMMARY
            const summaryMatch = aiResponse.match(/\*\*Summary:\*\*\s*([\s\S]+?)(?=\n\*\*|###|---|$)/);
            const summary = summaryMatch ? summaryMatch[1].trim() : "";

            // EXTRACT EACH DAY
            const dayRegex = /###\s*Day\s*(\d+):\s*(.+?)\s*\(~?(\d+)\s*minutes?\)?/gi;
            let dayMatch;

            while ((dayMatch = dayRegex.exec(aiResponse)) !== null) {
                const dayNumber = parseInt(dayMatch[1]);
                const focus = dayMatch[2].trim();
                const duration = parseInt(dayMatch[3]);

                const dayStart = dayMatch.index;
                const nextDayIndex = aiResponse.slice(dayStart + 1).search(/###\s*Day\s*\d+:/);
                const dayEnd = nextDayIndex !== -1 ? dayStart + 1 + nextDayIndex : aiResponse.length;
                const daySection = aiResponse.slice(dayStart, dayEnd);

                // WARM-UP SECTION
                const warmupMatch = daySection.match(
                    /\*\*Warm-up:\*\*\s*([\s\S]+?)(?=\n\*\*Exercises|\n\*\*Exercise|$)/i
                );
                const warmup = warmupMatch ? warmupMatch[1].trim() : "";

                // COOL-DOWN SECTION
                const cooldownMatch = daySection.match(
                    /\*\*Cool-down:\*\*\s*([\s\S]+?)(?=###|---|\*\*Additional|$)/i
                );
                const cooldown = cooldownMatch ? cooldownMatch[1].trim() : "";

                // EXERCISES
                const exercises = [];
                const exerciseRegex = /\d+\.\s*\*\*(.+?)\*\*\s*[-–]\s*(.+?)(?=\n\d+\.|\n\*\*|$)/gs;
                let exerciseMatch;

                while ((exerciseMatch = exerciseRegex.exec(daySection)) !== null) {
                    const exerciseName = exerciseMatch[1].trim();
                    const exerciseDetails = exerciseMatch[2].trim();

                    const setsMatch = exerciseDetails.match(/(\d+)\s*sets?/i);
                    const repsMatch = exerciseDetails.match(/[×x]\s*(\d+(?:-\d+)?)\s*reps?/i);
                    const restMatch = exerciseDetails.match(/Rest:\s*(\d+)\s*(seconds?|secs?|s)/i);

                    const escapedName = exerciseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                    const notesMatch = daySection.match(
                        new RegExp(
                            `\\*\\*${escapedName}\\*\\*[^\\n]*\\n\\s*-\\s*Notes?:\\s*([\\s\\S]+?)(?=\\n\\d+\\.|\\n\\*\\*|$)`
                        )
                    );
                    const notes = notesMatch ? notesMatch[1].trim() : "";

                    exercises.push({
                        name: exerciseName,
                        sets: setsMatch ? setsMatch[1] : "",
                        reps: repsMatch ? repsMatch[1] : "",
                        rest: restMatch ? restMatch[1] + " seconds" : "",
                        notes,
                    });
                }

                workoutDays.push({
                    dayNumber,
                    dayName: `Day ${dayNumber}`,
                    focus,
                    duration,
                    exercises,
                    warmup,
                    cooldown,
                });
            }

            // ADDITIONAL TIPS
            const tipsSection = aiResponse.match(/\*\*Additional Tips:\*\*\s*([\s\S]+)$/i);
            if (tipsSection) {
                const tipMatches = tipsSection[1].matchAll(/[-•]\s*(.+?)(?=\n[-•]|\n\n|$)/g);
                for (const tip of tipMatches) {
                    tips.push(tip[1].trim());
                }
            }

            // REST DAYS LOGIC
            const workoutDaysPerWeek = parseInt(profile.days_per_week) || workoutDays.length;
            const restDays = [];
            for (let i = workoutDaysPerWeek + 1; i <= 7; i++) {
                restDays.push(i);
            }

            return {
                planName: structure,
                summary: summary.substring(0, 500),
                fullPlan: aiResponse,
                structure,
                weeklySchedule: workoutDays,
                restDays,
                tips,
            };
        } catch (error) {
            console.error("Error parsing workout plan:", error);
            return {
                planName: "Custom Workout Plan",
                summary: "AI-generated workout plan based on your profile",
                fullPlan: aiResponse,
                structure: "Custom",
                weeklySchedule: [],
                restDays: [],
                tips: [],
            };
        }
    };

    const finishProfileAndRequestWorkoutPlan = async () => {
        setCollectingProfile(false);
        addMessage("assistant", "Thanks! Generating your personalized workout plan...");
        setIsLoading(true);

        try {
            const storedUserId = JSON.parse(localStorage.getItem('user'))._id;
            const userData = JSON.parse(localStorage.getItem("user") || '{}');
            const userId = storedUserId || userData?._id;
            const email = userData?.login?.email;

            if (!userId && !email) {
                addMessage("assistant", "Error: User not found. Please log in again.");
                setIsLoading(false);
                return;
            }

            const workoutDays = parseInt(profile.days_per_week) || 3;
            const timePerWorkout = parseInt(profile.time_per_workout) || 45;

            const enhancedPrompt = `Create a ${workoutDays}-day workout plan.

Profile:
- Age: ${profile.age} | Gender: ${profile.gender}
- Weight: ${profile.weight}kg → ${profile.goalWeight || profile.weight}kg
- Goal: ${profile.goal}
- Level: ${profile.level}
- Equipment: ${profile.equipment}
- Limitations: ${profile.limitations}
- Time: ${timePerWorkout} minutes per workout

Generate ${workoutDays} complete workout days following the exact format in your instructions. Label them as Day 1, Day 2, Day 3, etc.`;

            const result = await chatSessionRef.current.sendMessage(enhancedPrompt);
            const aiWorkoutText = result.response.text();

            console.log("AI Response:", aiWorkoutText);

            const parsedWorkoutPlan = parseWorkoutPlan(aiWorkoutText, profile);
            console.log("Parsed Workout Plan:", parsedWorkoutPlan);

            const payload = {
                personalDetails: {
                    age: parseInt(profile.age) || null,
                    gender: profile.gender || "",
                    height: parseFloat(profile.height) || null,
                    currentWeight: parseFloat(profile.weight) || null,
                    targetWeight: parseFloat(profile.goalWeight || profile.weight) || null
                },
                fitnessGoals: {
                    primaryGoal: profile.goal || "",
                    fitnessLevel: profile.level || "",
                    availableEquipment: profile.equipment ? [profile.equipment] : [],
                    injuries: (profile.limitations && profile.limitations.toLowerCase() !== "none")
                        ? [profile.limitations]
                        : []
                },
                schedule: {
                    workoutDaysPerWeek: workoutDays,
                    timePerWorkout: timePerWorkout
                },
                workoutPlan: parsedWorkoutPlan
            };

            if (userId) {
                payload.userId = userId;
            } else {
                payload.email = email;
            }

            console.log("Payload being sent:", JSON.stringify(payload, null, 2));

            const res = await fetch("/api/users/me", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, updateData: payload })
            });

            const data = await res.json();
            console.log("API Response:", data);

            if (data.success) {
                localStorage.setItem("user", JSON.stringify(data.user));
                if (userId) {
                    localStorage.setItem("userId", userId);
                }
                console.log("Profile and workout plan updated successfully");

                addMessage("assistant", aiWorkoutText);
                addMessage("assistant", `✅ Your ${workoutDays}-day workout plan has been generated and saved!`);
            } else {
                console.error("Failed to update profile:", data.error);
                addMessage("assistant", aiWorkoutText);
                addMessage("assistant", "⚠️ Workout plan generated but couldn't be saved. Please try again later.");
            }
        } catch (error) {
            console.error("Error in finishProfileAndRequestWorkoutPlan:", error);
            addMessage("assistant", "Error generating your workout plan. Please try again.");
        }

        setIsLoading(false);
    };

    const handleSubmit = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput("");
        addMessage("user", userMsg);

        if (collectingProfile) {
            handleProfileAnswer(userMsg);
            return;
        }

        setIsLoading(true);
        try {
            const result = await chatSessionRef.current.sendMessage(userMsg);
            const text = result.response.text();
            addMessage("assistant", text);
        } catch (e) {
            console.error("Chat error:", e);
            addMessage("assistant", "I encountered an error. Please try again.");
        }
        setIsLoading(false);
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg h-[600px] lg:h-[85vh] flex flex-col">
            <div className="p-6 border-b">
                <h3 className="text-2xl font-bold text-gray-600">AI Workout Assistant</h3>
                <p className="text-gray-600 text-sm">Powered by Google Gemini AI</p>
            </div>

            <div ref={messagesContainerRef} className="flex-1 p-6 overflow-y-auto space-y-4">
                {checkingProfile ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mx-auto mb-3" />
                            <p className="text-gray-600 font-medium">Checking your profile...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex items-start space-x-3 ${msg.role === "user" ? "flex-row-reverse space-x-reverse" : ""}`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === "assistant"
                                    ? "bg-linear-to-br from-cyan-400 to-blue-500"
                                    : "bg-linear-to-br from-purple-400 to-pink-500"
                                    }`}>
                                    {msg.role === "assistant" ? (
                                        <MessageCircle className="w-4 h-4 text-white" />
                                    ) : (
                                        <span className="text-white font-semibold text-sm">U</span>
                                    )}
                                </div>
                                <div className={`p-4 rounded-2xl max-w-2xl ${msg.role === "assistant"
                                    ? "bg-gray-100 rounded-tl-none text-gray-800"
                                    : "bg-linear-to-br from-cyan-400 to-blue-500 text-white rounded-tr-none"
                                    }`}>
                                    {msg.role === "assistant" ? (
                                        <div className="whitespace-pre-wrap">
                                            {msg.content.split("\n").map((line, idx) => processLine(line, idx))}
                                        </div>
                                    ) : (
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex items-start space-x-3">
                                <div className="w-8 h-8 bg-linear-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                                    <MessageCircle className="text-white w-4 h-4" />
                                </div>
                                <div className="bg-gray-100 p-4 rounded-2xl">
                                    <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            <div className="p-6 border-t flex space-x-3">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
                    placeholder={checkingProfile ? "Loading..." : collectingProfile ? "Answer the question..." : "Ask me anything about fitness..."}
                    disabled={checkingProfile}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-800"
                />
                <button
                    onClick={handleSubmit}
                    disabled={!input.trim() || isLoading || checkingProfile}
                    className="px-6 py-3 bg-cyan-500 text-white rounded-xl flex items-center space-x-2 hover:bg-cyan-600 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Thinking...</span>
                        </>
                    ) : (
                        <>
                            <Send className="w-5 h-5" />
                            <span>Send</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default Chatbot;