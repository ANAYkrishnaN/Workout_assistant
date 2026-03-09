/**
 * Posture session creation – mock implementation.
 * Returns a session ID for the tracker; no external backend required.
 */
export default function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const sessionId = Date.now().toString();
    return res.status(200).json({ session_id: sessionId });
}
