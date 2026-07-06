import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getGitHubToken(owner?: string): Promise<{ token: string; username: string }> {
    try {
        let credential;

        if (owner) {
            // Try to find credential matching the owner
            credential = await prisma.gitHubCredential.findFirst({
                where: {
                    username: {
                        equals: owner,
                        mode: 'insensitive'
                    }
                }
            });

            // If not found, log warning and fall back to most recent
            if (!credential) {
                console.warn(`[GitHub Auth] No credential found for owner: ${owner}, using most recent`);
            }
        }

        // If no owner specified or no matching credential, use most recent
        if (!credential) {
            credential = await prisma.gitHubCredential.findFirst({
                orderBy: {
                    createdAt: 'desc'
                }
            });
        }

        // Validation
        if (!credential) {
            throw new Error("GitHub token not configured. Please contact Super Admin.");
        }

        console.log(`[GitHub Auth] Token selected for owner: ${owner || 'default'}, username: ${credential.username}`);

        return { token: credential.token, username: credential.username };

    } catch (error) {
        console.error("[GitHub Auth] Token fetch failed:", error);
        throw error; // Re-throw to be handled by API routes
    }
}
