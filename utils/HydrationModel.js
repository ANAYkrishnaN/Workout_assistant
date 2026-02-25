import HydrationTrainingData from "@/data/HydrationTrainingData";

// Bucket adherence into behaviour groups
function bucketForAdherence(p) {
    if (p < 60) return "low";
    if (p < 100) return "medium";
    return "high";
}

/**
 * TRAINING STEP
 * -------------
 * Reads the 100-row dataset and learns:
 *   - for each (intensity, bucket) pair:
 *       * average reminder interval
 *       * most common tipCategory
 *
 * Output shape:
 * {
 *   light:   { low: { interval, tipCategory }, medium: {...}, high: {...} },
 *   moderate:{ ... },
 *   intense: { ... }
 * }
 */
export function trainHydrationModel(data = HydrationTrainingData) {
    const grouped = {}; // { intensity: { bucket: { intervals: [], tips: [] } } }

    for (const row of data) {
        const bucket = bucketForAdherence(row.adherencePercent);
        const intensity = row.intensity;

        if (!grouped[intensity]) grouped[intensity] = {};
        if (!grouped[intensity][bucket]) {
            grouped[intensity][bucket] = { intervals: [], tips: [] };
        }

        grouped[intensity][bucket].intervals.push(row.recommendedInterval);
        grouped[intensity][bucket].tips.push(row.tipCategory);
    }

    const model = {};

    // compute learned averages + most common tip for each group
    for (const intensity of Object.keys(grouped)) {
        model[intensity] = {};

        for (const bucket of Object.keys(grouped[intensity])) {
            const g = grouped[intensity][bucket];

            const avgInterval =
                g.intervals.reduce((sum, v) => sum + v, 0) / g.intervals.length;

            const tipCounts = {};
            g.tips.forEach((t) => {
                tipCounts[t] = (tipCounts[t] || 0) + 1;
            });

            const [bestTipCategory] = Object.entries(tipCounts).sort(
                (a, b) => b[1] - a[1]
            )[0];

            model[intensity][bucket] = {
                interval: Math.round(avgInterval),
                tipCategory: bestTipCategory,
            };
        }
    }

    return model;
}

// Train once when the module is loaded
const trainedHydrationModel = trainHydrationModel();

/**
 * INFERENCE STEP
 * --------------
 * Given:
 *   - avg adherencePercent over last 7 days
 *   - workoutIntensity ("light" | "moderate" | "intense")
 * returns:
 *   - interval (minutes)
 *   - tipText (user-facing AI message)
 */
export function inferHydrationDecision(adherencePercent, workoutIntensity) {
    const bucket = bucketForAdherence(adherencePercent);

    const intensityModel =
        trainedHydrationModel[workoutIntensity] ||
        trainedHydrationModel["moderate"] ||
        trainedHydrationModel[Object.keys(trainedHydrationModel)[0]];

    const cell =
        intensityModel[bucket] ||
        intensityModel["medium"] ||
        Object.values(intensityModel)[0];

    // Map tipCategory → real text
    let tipText = "";
    if (cell.tipCategory === "low") {
        tipText =
            "You usually don’t reach your water goal. Try drinking a small glass every time you check your phone.";
    } else if (cell.tipCategory === "medium") {
        tipText =
            "You are close to your water goal most days. One extra cup in the afternoon could help you hit 100%.";
    } else {
        tipText =
            "You regularly meet your water goal. Great job! Keep your current routine going.";
    }

    return {
        interval: cell.interval,
        tipText,
    };
}

// Optional: export the raw trained model if you want to inspect/log it
export function getTrainedHydrationModel() {
    return trainedHydrationModel;
}