// Split content into sections
export const formatContent = (text) => {
    // Split by numbered lists (1. 2. 3. etc.)
    const parts = text.split(/(\d+\.\s)/);
    const elements = [];

    let currentList = [];
    let currentText = '';

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        if (/^\d+\.\s$/.test(part)) {
            // This is a number marker
            if (currentText.trim()) {
                elements.push(<p key={`p-${i}`} className="mb-3 text-gray-800">{currentText.trim()}</p>);
                currentText = '';
            }

            if (i + 1 < parts.length) {
                currentList.push(parts[i + 1]);
                i++; // Skip next part as we've used it
            }
        } else if (!part.match(/^\d+\.\s$/)) {
            if (currentList.length > 0) {
                // Render the list
                elements.push(
                    <ol key={`ol-${i}`} className="mb-4 ml-4 space-y-2">
                        {currentList.map((item, idx) => (
                            <li key={idx} className="text-gray-800 leading-relaxed">{item.trim()}</li>
                        ))}
                    </ol>
                );
                currentList = [];
            }
            currentText += part;
        }
    }

    // Handle remaining content
    if (currentList.length > 0) {
        elements.push(
            <ol key="ol-final" className="mb-4 ml-4 space-y-2">
                {currentList.map((item, idx) => (
                    <li key={idx} className="text-gray-800 leading-relaxed">{item.trim()}</li>
                ))}
            </ol>
        );
    }

    if (currentText.trim()) {
        elements.push(<p key="p-final" className="mb-3 text-gray-800">{currentText.trim()}</p>);
    }

    return elements;
};

export const processBoldText = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={idx} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
        }
        return <span key={idx}>{part}</span>;
    });
};

export const processLine = (line, idx) => {
    // Skip empty lines
    if (!line.trim()) return null;

    // Check for emojis at the end
    const emojiMatch = line.match(/(.+?)(\s*[💪🏋️‍♂️🏃‍♀️🎯💯🔥✨👍⚡🌟]+\s*)$/);

    return (
        <p key={idx} className="text-gray-800 leading-relaxed mb-3">
            {processBoldText(emojiMatch ? emojiMatch[1] : line)}
            {emojiMatch && <span className="ml-1">{emojiMatch[2]}</span>}
        </p>
    );
};

export const getUserDetails = async (data) => {
    // console.log(data.user.id);

    const userRes = await fetch(`/api/users/me?userId=${data.user?.id}`);
    const userData = await userRes.json();
    console.log(userData);

    if (!userRes.ok) {
        console.log(userData.error);

    }

    return userData
}

export const getFirstName = () => {
    if (typeof window !== 'undefined') {
        // Get the stored user object
        const userStr = localStorage.getItem('user');
        if (!userStr) return '';

        try {
            const user = userStr || JSON.parse(userStr);
            const fullName = user?.login?.fullName || '';
            return fullName.split(' ')[0]; // Return first name
        } catch (err) {
            console.error('Error parsing user from localStorage', err);
            return '';
        }
    }
    return '';
};

export const createProfileSummary = (p) => `
User Profile:

PERSONAL DETAILS:
- Age: ${p.age}
- Gender: ${p.gender}
- Height: ${p.height}
- Weight: ${p.weight}

FITNESS INFORMATION:
- Fitness Goal: ${p.goal}
- Fitness Level: ${p.level}
- Available Days: ${p.days_per_week} days per week
- Time Per Workout: ${p.time_per_workout} minutes
- Equipment: ${p.equipment}
- Limitations: ${p.limitations}

Based on this profile, create a detailed personalized workout plan with specific exercises, sets, reps, and rest times.
`;