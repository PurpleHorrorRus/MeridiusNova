type SessionData = {
	userId: number;
	sessionId: string;
	deviceFingerprint: string;
	createdAt: number;
	lastAccessAt: number;
};

const activeSessions = new Map<string, SessionData>();

export function addSession(userId: number, sessionId: string, deviceFingerprint: string): void {
	activeSessions.set(sessionId, {
		userId,
		sessionId,
		deviceFingerprint,
		createdAt: Date.now(),
		lastAccessAt: Date.now()
	});
}

export function getSessionData(sessionId: string): SessionData | undefined {
	return activeSessions.get(sessionId);
}

export function updateSessionAccess(sessionId: string): void {
	const session = activeSessions.get(sessionId);
	if (session) {
		session.lastAccessAt = Date.now();
	}
}

export function removeSession(sessionId: string): void {
	activeSessions.delete(sessionId);
}

export function removeUserSessions(userId: number): void {
	for (const [sessionId, session] of activeSessions.entries()) {
		if (session.userId === userId) {
			activeSessions.delete(sessionId);
		}
	}
}

export function isValidSession(sessionId: string, userId: number): boolean {
	const session = getSessionData(sessionId);
	return session !== undefined && session.userId === userId;
}