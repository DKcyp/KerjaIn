import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const credentials = await prisma.gitHubCredential.findMany({
            select: { username: true, token: true },
            orderBy: { createdAt: 'desc' }
        });

        if (credentials.length === 0) {
            return NextResponse.json(
                { error: "No GitHub credentials configured" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            usernames: credentials.map(c => c.username),
            username: credentials[0].username, // Primary (first) for backward compatibility
            token: credentials[0].token // Primary token for backward compatibility
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Failed to get GitHub username" },
            { status: 500 }
        );
    }
}
