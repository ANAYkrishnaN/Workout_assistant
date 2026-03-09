import formidable from 'formidable';
import fs from 'fs';

export const config = {
    api: { bodyParser: false },
};

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Proxy posture analysis to FastAPI MediaPipe backend.
 * Accepts multipart: file, session_id, workout_name, mode, target_reps.
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const form = formidable({ multiples: false });
        const [fields, files] = await form.parse(req);

        const getField = (name) => {
            const v = fields[name];
            return Array.isArray(v) ? v[0] : v;
        };

        const fileList = files?.file;
        const file = Array.isArray(fileList) ? fileList[0] : fileList;
        if (!file?.filepath) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const sessionId = getField('session_id') || '';
        const workoutName = getField('workout_name') || 'Push Up';
        const mode = getField('mode') || 'manual';
        const targetReps = getField('target_reps') || '0';

        const buffer = fs.readFileSync(file.filepath);
        const formData = new FormData();
        formData.append('file', new Blob([buffer], { type: file.mimetype || 'image/jpeg' }), file.originalFilename || 'frame.jpg');
        formData.append('session_id', sessionId);
        formData.append('workout_name', workoutName);
        formData.append('mode', mode);
        formData.append('target_reps', String(targetReps));

        const backendRes = await fetch(`${BACKEND_URL}/posture/analyze`, {
            method: 'POST',
            body: formData,
        });

        const data = await backendRes.json().catch(() => ({}));
        if (!backendRes.ok) {
            return res.status(backendRes.status).json(data.detail ? { error: data.detail } : data);
        }
        return res.status(200).json(data);
    } catch (err) {
        console.error('Posture analyze proxy error:', err);
        return res.status(500).json({ error: 'Analysis failed', detected: false, reps: 0, calories: 0, angle: 0, message: 'Server error', fps: 0, detected_label: '', done_by_target: false });
    }
}
