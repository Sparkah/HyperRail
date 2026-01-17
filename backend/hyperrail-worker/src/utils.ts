// utils.ts
export function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json;charset=UTF-8",
            "Access-Control-Allow-Origin": "*", // Allow all origins
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
}