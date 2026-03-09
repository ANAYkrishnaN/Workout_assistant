const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Proxy posture session reset to FastAPI (clears server-side rep state).
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    } catch (_) {
        return res.status(400).json({ error: 'Invalid JSON' });
    }

    const sessionId = body.session_id;
    if (!sessionId) {
        return res.status(400).json({ error: 'session_id required' });
    }

    try {
        const backendRes = await fetch(`${BACKEND_URL}/posture/reset_session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId }),
        });
        const data = await backendRes.json().catch(() => ({}));
        if (!backendRes.ok) {
            return res.status(backendRes.status).json(data.detail ? { error: data.detail } : data);
        }
        return res.status(200).json(data);
    } catch (err) {
        console.error('Posture reset proxy error:', err);
        return res.status(502).json({ error: 'Backend unavailable', success: false });
    }
}
