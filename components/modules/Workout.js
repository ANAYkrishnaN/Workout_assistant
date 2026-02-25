import React, { useState } from 'react'

const Workout = () => {
    const [activeTab, setActiveTab] = useState('today')
    const [selectedWorkout, setSelectedWorkout] = useState(null)

    // Sample workout data - in real app, this would come from chatbot/API
    const workoutPlan = {
        today: {
            day: 'Monday',
            date: 'Nov 30, 2025',
            focus: 'Upper Body Strength',
            duration: '45 min',
            completed: false,
            exercises: [
                { id: 1, name: 'Bench Press', sets: 4, reps: '8-10', rest: '90s', notes: 'Moderate weight, focus on form', completed: false },
                { id: 2, name: 'Dumbbell Rows', sets: 4, reps: '10-12', rest: '60s', notes: 'Keep back straight', completed: false },
                { id: 3, name: 'Shoulder Press', sets: 3, reps: '10', rest: '60s', notes: 'Control the movement', completed: false },
                { id: 4, name: 'Bicep Curls', sets: 3, reps: '12', rest: '45s', notes: 'Superset with triceps', completed: false },
                { id: 5, name: 'Tricep Dips', sets: 3, reps: '12', rest: '45s', notes: 'Use bench if needed', completed: false },
                { id: 6, name: 'Plank Hold', sets: 3, reps: '60s', rest: '30s', notes: 'Engage core throughout', completed: false }
            ]
        },
        upcoming: [
            {
                day: 'Tuesday',
                date: 'Dec 1, 2025',
                focus: 'Lower Body & Core',
                duration: '50 min',
                exercises: [
                    { name: 'Squats', sets: 4, reps: '10-12' },
                    { name: 'Romanian Deadlifts', sets: 4, reps: '10' },
                    { name: 'Lunges', sets: 3, reps: '12 each leg' },
                    { name: 'Leg Press', sets: 3, reps: '12-15' },
                    { name: 'Core Circuit', sets: 3, reps: '45s each' }
                ]
            },
            {
                day: 'Wednesday',
                date: 'Dec 2, 2025',
                focus: 'Cardio & Mobility',
                duration: '40 min',
                exercises: [
                    { name: 'Treadmill Run', sets: 1, reps: '20 min' },
                    { name: 'Jump Rope', sets: 3, reps: '3 min' },
                    { name: 'Dynamic Stretching', sets: 1, reps: '15 min' }
                ]
            },
            {
                day: 'Thursday',
                date: 'Dec 3, 2025',
                focus: 'Full Body Circuit',
                duration: '45 min',
                exercises: [
                    { name: 'Burpees', sets: 3, reps: '15' },
                    { name: 'Push-ups', sets: 3, reps: '20' },
                    { name: 'Kettlebell Swings', sets: 3, reps: '15' },
                    { name: 'Mountain Climbers', sets: 3, reps: '30s' }
                ]
            }
        ],
        previous: [
            {
                day: 'Sunday',
                date: 'Nov 29, 2025',
                focus: 'Rest & Recovery',
                duration: '30 min',
                completed: true,
                completionRate: 100,
                exercises: [
                    { name: 'Yoga Flow', sets: 1, reps: '20 min', completed: true, notes: 'Felt great, good flexibility' },
                    { name: 'Foam Rolling', sets: 1, reps: '10 min', completed: true, notes: 'Focused on legs and back' }
                ]
            },
            {
                day: 'Saturday',
                date: 'Nov 28, 2025',
                focus: 'HIIT Training',
                duration: '35 min',
                completed: true,
                completionRate: 85,
                exercises: [
                    { name: 'Jumping Jacks', sets: 4, reps: '45s', completed: true, notes: 'High intensity' },
                    { name: 'High Knees', sets: 4, reps: '45s', completed: true, notes: 'Good cardio burn' },
                    { name: 'Burpees', sets: 4, reps: '30s', completed: true, notes: 'Challenging but completed' },
                    { name: 'Mountain Climbers', sets: 4, reps: '45s', completed: false, notes: 'Skipped due to fatigue' },
                    { name: 'Cool Down Walk', sets: 1, reps: '5 min', completed: true, notes: 'Recovered well' }
                ]
            },
            {
                day: 'Friday',
                date: 'Nov 27, 2025',
                focus: 'Back & Shoulders',
                duration: '45 min',
                completed: true,
                completionRate: 100,
                exercises: [
                    { name: 'Pull-ups', sets: 4, reps: '8', completed: true, notes: 'Used assistance band' },
                    { name: 'Lat Pulldowns', sets: 4, reps: '12', completed: true, notes: 'Good contraction' },
                    { name: 'Face Pulls', sets: 3, reps: '15', completed: true, notes: 'Focus on rear delts' },
                    { name: 'Lateral Raises', sets: 3, reps: '12', completed: true, notes: 'Light weight, high reps' }
                ]
            }
        ]
    }

    const [todayWorkout, setTodayWorkout] = useState(workoutPlan.today)

    const toggleExerciseComplete = (exerciseId) => {
        setTodayWorkout(prev => ({
            ...prev,
            exercises: prev.exercises.map(ex =>
                ex.id === exerciseId ? { ...ex, completed: !ex.completed } : ex
            )
        }))
    }

    const completedCount = todayWorkout.exercises.filter(ex => ex.completed).length
    const totalExercises = todayWorkout.exercises.length
    const completionPercentage = Math.round((completedCount / totalExercises) * 100)

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl p-2 shadow-lg">
                <div className="flex gap-2">
                    {[
                        { id: 'today', label: "Today's Workout", icon: '🎯' },
                        { id: 'upcoming', label: 'Upcoming', icon: '📅' },
                        { id: 'previous', label: 'History', icon: '📊' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${activeTab === tab.id
                                ? 'bg-cyan-500 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <span className="mr-2">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Today's Workout */}
            {activeTab === 'today' && (
                <div className="bg-white rounded-2xl p-8 shadow-lg">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-800">{todayWorkout.focus}</h2>
                            <p className="text-gray-500 mt-1">{todayWorkout.day}, {todayWorkout.date}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-cyan-600">{todayWorkout.duration}</div>
                            <div className="text-sm text-gray-500">Duration</div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-600">Workout Progress</span>
                            <span className="text-sm font-bold text-cyan-600">
                                {completedCount}/{totalExercises} exercises
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                                className="bg-linear-to-r from-cyan-400 to-blue-500 h-3 rounded-full transition-all duration-500"
                                style={{ width: `${completionPercentage}%` }}
                            />
                        </div>
                    </div>

                    {/* Exercise List */}
                    <div className="space-y-4">
                        {todayWorkout.exercises.map((exercise, index) => (
                            <div
                                key={exercise.id}
                                className={`border-2 rounded-xl p-5 transition-all ${exercise.completed
                                    ? 'border-green-300 bg-green-50'
                                    : 'border-gray-200 bg-white hover:border-cyan-300'
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <button
                                        onClick={() => toggleExerciseComplete(exercise.id)}
                                        className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${exercise.completed
                                            ? 'bg-green-500 border-green-500'
                                            : 'border-gray-300 hover:border-cyan-500'
                                            }`}
                                    >
                                        {exercise.completed && (
                                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </button>

                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className={`font-bold text-lg ${exercise.completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                                                    {index + 1}. {exercise.name}
                                                </h4>
                                                <div className="flex gap-4 mt-1 text-sm text-gray-600">
                                                    <span className="font-medium">{exercise.sets} sets</span>
                                                    <span>•</span>
                                                    <span className="font-medium">{exercise.reps} reps</span>
                                                    <span>•</span>
                                                    <span className="font-medium">{exercise.rest} rest</span>
                                                </div>
                                            </div>
                                        </div>
                                        {exercise.notes && (
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                                                <p className="text-sm text-blue-800">
                                                    <span className="font-semibold">💡 Note:</span> {exercise.notes}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {completionPercentage === 100 && (
                        <div className="mt-6 p-5 bg-linear-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl">
                            <p className="text-lg font-bold text-green-800 text-center">
                                🎉 Congratulations! You&apos;ve completed today&apos;s workout!
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Upcoming Workouts */}
            {activeTab === 'upcoming' && (
                <div className="space-y-4">
                    {workoutPlan.upcoming.map((workout, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                            onClick={() => setSelectedWorkout(selectedWorkout === index ? null : index)}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-12 h-12 bg-linear-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                                            {workout.day.substring(0, 3)}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-800">{workout.focus}</h3>
                                            <p className="text-sm text-gray-500">{workout.day}, {workout.date}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-cyan-600">{workout.duration}</div>
                                    <div className="text-xs text-gray-500">{workout.exercises.length} exercises</div>
                                </div>
                            </div>

                            {selectedWorkout === index && (
                                <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                                    {workout.exercises.map((exercise, exIndex) => (
                                        <div key={exIndex} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                            <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center text-cyan-600 font-bold text-sm">
                                                {exIndex + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-800">{exercise.name}</p>
                                                <p className="text-sm text-gray-600">
                                                    {exercise.sets} sets × {exercise.reps}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Previous Workouts */}
            {activeTab === 'previous' && (
                <div className="space-y-4">
                    {workoutPlan.previous.map((workout, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-2xl p-6 shadow-lg"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-12 h-12 bg-linear-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center text-white">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-800">{workout.focus}</h3>
                                            <p className="text-sm text-gray-500">{workout.day}, {workout.date}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-2xl font-bold ${workout.completionRate === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                                        {workout.completionRate}%
                                    </div>
                                    <div className="text-xs text-gray-500">Completed</div>
                                </div>
                            </div>

                            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                                <div
                                    className={`h-2 rounded-full ${workout.completionRate === 100 ? 'bg-green-500' : 'bg-amber-500'}`}
                                    style={{ width: `${workout.completionRate}%` }}
                                />
                            </div>

                            <div className="space-y-2">
                                {workout.exercises.map((exercise, exIndex) => (
                                    <div
                                        key={exIndex}
                                        className={`p-3 rounded-lg ${exercise.completed ? 'bg-green-50' : 'bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${exercise.completed ? 'bg-green-500' : 'bg-gray-300'
                                                }`}>
                                                {exercise.completed && (
                                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className={`font-semibold ${exercise.completed ? 'text-gray-700' : 'text-gray-400'}`}>
                                                    {exercise.name}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {exercise.sets} sets × {exercise.reps}
                                                </p>
                                                {exercise.notes && (
                                                    <p className="text-sm text-gray-600 mt-1 italic">&quot;{exercise.notes}&quot;</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default Workout