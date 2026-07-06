export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

// GET /api/programmer-status/projects -> get projects for all programmers
export async function GET() {
    try {
        // Get all programmer-project relationships with project details using raw query
        const proyekTeams: any[] = await prisma.$queryRaw`
            SELECT 
                pt."pegawaiId",
                p."namaProyek"
            FROM "proyek_team" pt
            LEFT JOIN "proyek" p ON pt."projectId" = p."id"
            WHERE pt."pegawaiId" IS NOT NULL AND p."namaProyek" IS NOT NULL
        `;

        // Group projects by programmer ID
        const projectsByProgrammer: Record<number, string[]> = {};
        
        proyekTeams.forEach((team) => {
            const programmerId = team.pegawaiId;
            const projectName = team.namaProyek;
            
            if (programmerId && projectName) {
                if (!projectsByProgrammer[programmerId]) {
                    projectsByProgrammer[programmerId] = [];
                }
                projectsByProgrammer[programmerId].push(projectName);
            }
        });

        // Convert to array format with comma-separated projects
        const result = Object.entries(projectsByProgrammer).map(([programmerId, projects]) => ({
            programmerId: Number(programmerId),
            projects: projects.join(', '),
            projectCount: projects.length,
        }));

        return NextResponse.json({ items: result });
    } catch (e) {
        console.error('GET /api/programmer-status/projects error', e);
        return NextResponse.json({ error: 'Server error', details: String(e) }, { status: 500 });
    }
}
