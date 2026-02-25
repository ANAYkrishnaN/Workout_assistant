'use client';

import React, { useState, useEffect } from 'react';
import { User, Edit2, Save, X, Dumbbell, Target, Calendar, Clock, TrendingUp, Activity, ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/router';

export default function UserProfile() {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [userId, setUserId] = useState(null);

    const [profile, setProfile] = useState({
        name: '',
        age: '',
        gender: '',
        height: '',
        weight: '',
        goal: '',
        level: '',
        daysPerWeek: '',
        timePerWorkout: '',
        equipment: '',
        limitations: '',
        startDate: '',
        targetWeight: ''
    });

    const [editedProfile, setEditedProfile] = useState(profile);

    // Fetch user data on component mount
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                // Get userId from localStorage or session
                const storedUserId = JSON.parse(localStorage.getItem('user'))._id;
                console.log(storedUserId._id);

                if (!storedUserId) {
                    setError('No user ID found. Please log in.');
                    setLoading(false);
                    return;
                }

                setUserId(storedUserId);

                const response = await fetch(`/api/users/me?userId=${storedUserId}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch user data');
                }

                // Map API data to profile state
                const userData = data.user;
                const mappedProfile = {
                    name: userData.login?.fullName || '',
                    age: userData.personalDetails?.age?.toString() || '',
                    gender: userData.personalDetails?.gender || '',
                    height: userData.personalDetails?.height?.toString() || '',
                    weight: userData.personalDetails?.currentWeight?.toString() || '',
                    targetWeight: userData.personalDetails?.targetWeight?.toString() || '',
                    goal: userData.fitnessGoals?.primaryGoal || '',
                    level: userData.fitnessGoals?.fitnessLevel || '',
                    equipment: userData.fitnessGoals?.availableEquipment?.[0] || '',
                    limitations: userData.fitnessGoals?.injuries?.join(', ') || 'None',
                    daysPerWeek: userData.schedule?.workoutDaysPerWeek?.toString() || '',
                    timePerWorkout: userData.schedule?.timePerWorkout?.toString() || '',
                    startDate: new Date(userData.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    })
                };

                setProfile(mappedProfile);
                setEditedProfile(mappedProfile);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching user data:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    const handleEdit = () => {
        setIsEditing(true);
        setEditedProfile(profile);
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);

        try {
            // Map profile state back to API format
            const updateData = {
                'login.fullName': editedProfile.name,
                'personalDetails.age': parseInt(editedProfile.age) || null,
                'personalDetails.gender': editedProfile.gender,
                'personalDetails.height': parseFloat(editedProfile.height) || null,
                'personalDetails.currentWeight': parseFloat(editedProfile.weight) || null,
                'personalDetails.targetWeight': parseFloat(editedProfile.targetWeight) || null,
                'fitnessGoals.primaryGoal': editedProfile.goal,
                'fitnessGoals.fitnessLevel': editedProfile.level,
                'fitnessGoals.availableEquipment': [editedProfile.equipment],
                'fitnessGoals.injuries': editedProfile.limitations === 'None' ? [] : editedProfile.limitations.split(',').map(i => i.trim()),
                'schedule.workoutDaysPerWeek': parseInt(editedProfile.daysPerWeek) || null,
                'schedule.timePerWorkout': parseInt(editedProfile.timePerWorkout) || null
            };

            const response = await fetch('/api/users/me', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    updateData: updateData
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update profile');
            }

            setProfile(editedProfile);
            setIsEditing(false);
            setSaving(false);
        } catch (err) {
            console.error('Error updating profile:', err);
            setError(err.message);
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditedProfile(profile);
        setIsEditing(false);
    };

    const handleChange = (field, value) => {
        setEditedProfile({ ...editedProfile, [field]: value });
    };

    const calculateWeeklyMinutes = () => {
        const days = parseInt(editedProfile.daysPerWeek) || 0;
        const minutes = parseInt(editedProfile.timePerWorkout) || 0;
        return days * minutes;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (error && !profile.name) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center bg-white rounded-2xl shadow-lg p-8 max-w-md">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Profile</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => router.push('')}
                        className="px-6 py-3 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition font-medium"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Navigation */}
            <div className="bg-gray-900 text-white px-6 py-4 shadow">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center">
                            <Dumbbell className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-wide">FitTrack</h1>
                    </div>
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="cursor-pointer flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </button>
                </div>
            </div>

            {error && (
                <div className="max-w-7xl mx-auto px-6 pt-6">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                        <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <p className="text-red-700 font-medium">{error}</p>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                {/* Profile Header */}
                <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full flex items-center justify-center shadow-xl">
                            <User className="w-12 h-12 text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900">{profile.name}</h2>
                            <p className="text-gray-500 mt-1">Member since {profile.startDate}</p>
                            <div className="flex gap-2 mt-3">
                                <span className="px-3 py-1 bg-cyan-50 text-cyan-700 rounded-full text-sm font-semibold">{profile.level}</span>
                                <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm font-semibold">{profile.daysPerWeek} days/week</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        {!isEditing ? (
                            <button
                                onClick={handleEdit}
                                className="flex items-center gap-2 px-6 py-3 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition font-medium"
                            >
                                <Edit2 className="w-5 h-5" /> Edit Profile
                            </button>
                        ) : (
                            <div className="flex gap-3">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" /> Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" /> Save
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <X className="w-5 h-5" /> Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                        { label: 'Current Weight', value: profile.weight + ' lbs', color: 'gray' },
                        { label: 'Target Weight', value: profile.targetWeight + ' lbs', color: 'gray' },
                        { label: 'Height', value: profile.height + '"', color: 'gray' },
                        { label: 'Age', value: profile.age, color: 'gray' },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-white rounded-xl shadow p-6 text-center hover:shadow-lg transition">
                            <p className="text-gray-600 font-medium">{stat.label}</p>
                            <p className="text-3xl font-bold text-gray-900">
                                {stat.value.split(' ')[0]}
                            </p>
                            {stat.value.split(' ')[1] && <p className="text-sm text-gray-500">{stat.value.split(' ')[1]}</p>}
                        </div>
                    ))}
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Details */}
                    <Card title="Personal Details" icon={<User className="w-5 h-5 text-cyan-600" />}>
                        <Detail label="Name" value={profile.name} editing={isEditing} type="text" field="name" editedProfile={editedProfile} handleChange={handleChange} />
                        <Detail label="Age" value={profile.age + ' years'} editing={isEditing} type="number" field="age" editedProfile={editedProfile} handleChange={handleChange} />
                        <Detail label="Gender" value={profile.gender} editing={isEditing} type="select" options={['Male', 'Female', 'Other']} field="gender" editedProfile={editedProfile} handleChange={handleChange} />
                        <Detail label="Height" value={profile.height + ' inches'} editing={isEditing} type="number" field="height" editedProfile={editedProfile} handleChange={handleChange} />
                        <Detail label="Current Weight" value={profile.weight + ' lbs'} editing={isEditing} type="number" field="weight" editedProfile={editedProfile} handleChange={handleChange} />
                        <Detail label="Target Weight" value={profile.targetWeight + ' lbs'} editing={isEditing} type="number" field="targetWeight" editedProfile={editedProfile} handleChange={handleChange} />
                    </Card>

                    {/* Fitness Goals */}
                    <Card title="Fitness Goals" icon={<Target className="w-5 h-5 text-purple-600" />}>
                        <Detail label="Primary Goal" value={profile.goal} editing={isEditing} type="select" options={['Build muscle', 'Lose weight', 'General fitness/toning', 'Improve strength', 'Improve endurance']} field="goal" editedProfile={editedProfile} handleChange={handleChange} />
                        <Detail label="Fitness Level" value={profile.level} editing={isEditing} type="select" options={['Beginner', 'Intermediate', 'Advanced']} field="level" editedProfile={editedProfile} handleChange={handleChange} />
                        <Detail label="Available Equipment" value={profile.equipment} editing={isEditing} type="select" options={['Full gym', 'Home gym (dumbbells, bench, etc.)', 'Minimal equipment (resistance bands, bodyweight)', 'No equipment (bodyweight only)']} field="equipment" editedProfile={editedProfile} handleChange={handleChange} />
                        <Detail label="Injuries / Limitations" value={profile.limitations} editing={isEditing} type="textarea" field="limitations" editedProfile={editedProfile} handleChange={handleChange} />
                    </Card>
                </div>

                {/* Schedule & Progress */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card title="Schedule & Availability" icon={<Calendar className="w-5 h-5 text-green-600" />}>
                        <Detail label="Workout Days per Week" value={profile.daysPerWeek + ' days'} editing={isEditing} type="number" field="daysPerWeek" editedProfile={editedProfile} handleChange={handleChange} min={1} max={7} />
                        <Detail label="Time per Workout" value={profile.timePerWorkout + ' minutes'} editing={isEditing} type="number" field="timePerWorkout" editedProfile={editedProfile} handleChange={handleChange} />
                        <div className="mt-4 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-5 border border-cyan-200">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-5 h-5 text-cyan-600" />
                                <p className="text-xs font-bold uppercase tracking-wide text-gray-700">Weekly Commitment</p>
                            </div>
                            <p className="text-3xl font-bold text-cyan-600">{calculateWeeklyMinutes()}</p>
                            <p className="text-sm font-medium text-gray-700 mt-1">minutes per week</p>
                        </div>
                    </Card>

                    <Card title="Progress & Achievements" icon={<TrendingUp className="w-5 h-5 text-orange-600" />}>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200 text-center">
                                <p className="text-xs font-bold uppercase text-gray-700 mb-2">Workouts Completed</p>
                                <p className="text-2xl font-bold text-green-600">12</p>
                            </div>
                            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-5 border border-orange-200 text-center">
                                <p className="text-xs font-bold uppercase text-gray-700 mb-2">Calories Burned</p>
                                <p className="text-2xl font-bold text-orange-600">2,400 kcal</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// --- Reusable Card Component ---
const Card = ({ title, icon, children }) => (
    <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition">
        <div className="flex items-center gap-2 mb-6 pb-2 border-b border-gray-100">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">{icon}</div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        </div>
        <div className="space-y-5">{children}</div>
    </div>
);

// --- Reusable Detail Field Component ---
const Detail = ({ label, value, editing, type, options, field, editedProfile, handleChange, min, max }) => (
    <div>
        <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-2">{label}</label>
        {editing ? (
            type === 'select' ? (
                <select
                    value={editedProfile[field]}
                    onChange={(e) => handleChange(field, e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900 font-medium"
                >
                    {options.map((opt) => <option key={opt}>{opt}</option>)}
                </select>
            ) : type === 'textarea' ? (
                <textarea
                    value={editedProfile[field]}
                    onChange={(e) => handleChange(field, e.target.value)}
                    rows="3"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900 font-medium"
                />
            ) : (
                <input
                    type={type}
                    value={editedProfile[field]}
                    min={min}
                    max={max}
                    onChange={(e) => handleChange(field, e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900 font-medium"
                />
            )
        ) : (
            <p className="text-gray-900 font-semibold text-base">{value}</p>
        )}
    </div>
);