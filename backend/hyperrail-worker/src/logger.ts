// Structured audit trail logger
// Outputs JSON logs for easy parsing and analysis

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export type AuditAction =
	| 'REQUEST_RECEIVED'
	| 'REQUEST_COMPLETED'
	| 'GIFT_CREATE_STARTED'
	| 'GIFT_CREATE_SUCCESS'
	| 'GIFT_CREATE_FAILED'
	| 'GIFT_FETCH_STARTED'
	| 'GIFT_FETCH_SUCCESS'
	| 'GIFT_FETCH_NOT_FOUND'
	| 'GIFT_FETCH_FAILED'
	| 'CLAIM_STARTED'
	| 'CLAIM_TX_SUBMITTED'
	| 'CLAIM_SUCCESS'
	| 'CLAIM_FAILED'
	| 'VALIDATION_FAILED'
	| 'DB_ERROR'
	| 'RPC_ERROR';

interface AuditLog {
	timestamp: string;
	level: LogLevel;
	action: AuditAction;
	// Request context
	requestId?: string;
	method?: string;
	path?: string;
	// Gift context
	claimId?: string;
	senderAddress?: string;
	walletAddress?: string;
	amount?: string;
	// Transaction context
	txHash?: string;
	chain?: string;
	// Result context
	status?: number;
	durationMs?: number;
	error?: string;
	// Additional context
	meta?: Record<string, unknown>;
}

function generateRequestId(): string {
	return Math.random().toString(36).substring(2, 10);
}

function emit(log: AuditLog) {
	// Output as single-line JSON for easy parsing
	console.log(JSON.stringify(log));
}

// Request context to pass through handlers
export interface RequestContext {
	requestId: string;
	method: string;
	path: string;
	startTime: number;
}

export const audit = {
	// Start a new request context
	startRequest(method: string, path: string): RequestContext {
		const ctx: RequestContext = {
			requestId: generateRequestId(),
			method,
			path,
			startTime: Date.now(),
		};

		emit({
			timestamp: new Date().toISOString(),
			level: 'INFO',
			action: 'REQUEST_RECEIVED',
			requestId: ctx.requestId,
			method,
			path,
		});

		return ctx;
	},

	// End request
	endRequest(ctx: RequestContext, status: number) {
		emit({
			timestamp: new Date().toISOString(),
			level: status >= 400 ? 'WARN' : 'INFO',
			action: 'REQUEST_COMPLETED',
			requestId: ctx.requestId,
			method: ctx.method,
			path: ctx.path,
			status,
			durationMs: Date.now() - ctx.startTime,
		});
	},

	// Gift creation
	giftCreateStarted(ctx: RequestContext, claimId: string, senderAddress: string, amount: string) {
		emit({
			timestamp: new Date().toISOString(),
			level: 'INFO',
			action: 'GIFT_CREATE_STARTED',
			requestId: ctx.requestId,
			claimId: maskId(claimId),
			senderAddress: maskAddress(senderAddress),
			amount,
		});
	},

	giftCreateSuccess(ctx: RequestContext, claimId: string, amount: string) {
		emit({
			timestamp: new Date().toISOString(),
			level: 'INFO',
			action: 'GIFT_CREATE_SUCCESS',
			requestId: ctx.requestId,
			claimId: maskId(claimId),
			amount,
		});
	},

	giftCreateFailed(ctx: RequestContext, claimId: string, error: string) {
		emit({
			timestamp: new Date().toISOString(),
			level: 'ERROR',
			action: 'GIFT_CREATE_FAILED',
			requestId: ctx.requestId,
			claimId: maskId(claimId),
			error,
		});
	},

	// Gift fetch
	giftFetchStarted(ctx: RequestContext, claimId: string) {
		emit({
			timestamp: new Date().toISOString(),
			level: 'DEBUG',
			action: 'GIFT_FETCH_STARTED',
			requestId: ctx.requestId,
			claimId: maskId(claimId),
		});
	},

	giftFetchSuccess(ctx: RequestContext, claimId: string, amount: string) {
		emit({
			timestamp: new Date().toISOString(),
			level: 'INFO',
			action: 'GIFT_FETCH_SUCCESS',
			requestId: ctx.requestId,
			claimId: maskId(claimId),
			amount,
		});
	},

	giftFetchNotFound(ctx: RequestContext, claimId: string) {
		emit({
			timestamp: new Date().toISOString(),
			level: 'WARN',
			action: 'GIFT_FETCH_NOT_FOUND',
			requestId: ctx.requestId,
			claimId: maskId(claimId),
		});
	},

	// Claim
	claimStarted(ctx: RequestContext, walletAddress: string) {
		emit({
			timestamp: new Date().toISOString(),
			level: 'INFO',
			action: 'CLAIM_STARTED',
			requestId: ctx.requestId,
			walletAddress: maskAddress(walletAddress),
		});
	},

	claimTxSubmitted(ctx: RequestContext, txHash: string, chain: string) {
		emit({
			timestamp: new Date().toISOString(),
			level: 'INFO',
			action: 'CLAIM_TX_SUBMITTED',
			requestId: ctx.requestId,
			txHash,
			chain,
		});
	},

	claimSuccess(ctx: RequestContext, txHash: string, walletAddress: string) {
		emit({
			timestamp: new Date().toISOString(),
			level: 'INFO',
			action: 'CLAIM_SUCCESS',
			requestId: ctx.requestId,
			txHash,
			walletAddress: maskAddress(walletAddress),
		});
	},

	claimFailed(ctx: RequestContext, error: string) {
		emit({
			timestamp: new Date().toISOString(),
			level: 'ERROR',
			action: 'CLAIM_FAILED',
			requestId: ctx.requestId,
			error,
		});
	},

	// Validation errors
	validationFailed(ctx: RequestContext, error: string) {
		emit({
			timestamp: new Date().toISOString(),
			level: 'WARN',
			action: 'VALIDATION_FAILED',
			requestId: ctx.requestId,
			error,
		});
	},

	// Database errors
	dbError(ctx: RequestContext, error: string) {
		emit({
			timestamp: new Date().toISOString(),
			level: 'ERROR',
			action: 'DB_ERROR',
			requestId: ctx.requestId,
			error,
		});
	},

	// RPC errors
	rpcError(ctx: RequestContext, error: string, chain: string) {
		emit({
			timestamp: new Date().toISOString(),
			level: 'ERROR',
			action: 'RPC_ERROR',
			requestId: ctx.requestId,
			error,
			chain,
		});
	},
};

// Helper to mask sensitive data for logs
function maskId(id: string): string {
	if (!id || id.length < 12) return id;
	return id.slice(0, 10) + '...' + id.slice(-4);
}

function maskAddress(addr: string): string {
	if (!addr || addr.length < 10) return addr;
	return addr.slice(0, 6) + '...' + addr.slice(-4);
}
