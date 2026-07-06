import { prisma } from '@/lib/prisma';

/**
 * Update programmer status with automatic logging
 */
export async function updateProgrammerStatus(params: {
    programmerId: number;
    status: 'Free' | 'Work';
    notes: string | null;
    updatedBy: number;
}): Promise<void> {
    const { programmerId, status, notes, updatedBy } = params;

    console.log(`[ProgrammerStatus] Updating status for programmer ${programmerId} to ${status}`);

    // Get current status
    const currentStatus = await prisma.programmerStatus.findUnique({
        where: { programmerId },
    });

    // If no status record exists, create one
    if (!currentStatus) {
        console.log(`[ProgrammerStatus] Creating new status record for programmer ${programmerId}`);
        const newStatus = await prisma.programmerStatus.create({
            data: {
                programmerId,
                status,
                notes,
                updatedBy,
            },
        });

        // Create log entry
        await prisma.programmerStatusLog.create({
            data: {
                statusId: newStatus.id,
                programmerId,
                oldStatus: null,
                newStatus: status,
                notes: notes || `Status set to ${status}`,
                changedBy: updatedBy,
            },
        });

        console.log(`[ProgrammerStatus] ✅ Created new status: ${status}`);
        return;
    }

    // Check if status actually changed
    const statusChanged = currentStatus.status !== status;
    const notesChanged = currentStatus.notes !== notes;

    if (!statusChanged && !notesChanged) {
        console.log(`[ProgrammerStatus] No changes needed for programmer ${programmerId}`);
        return;
    }

    // Update status
    await prisma.programmerStatus.update({
        where: { programmerId },
        data: {
            status,
            notes,
            updatedBy,
        },
    });

    // Create log entry if status changed
    if (statusChanged) {
        await prisma.programmerStatusLog.create({
            data: {
                statusId: currentStatus.id,
                programmerId,
                oldStatus: currentStatus.status,
                newStatus: status,
                notes: notes || `Status changed from ${currentStatus.status} to ${status}`,
                changedBy: updatedBy,
            },
        });
        console.log(`[ProgrammerStatus] ✅ Status updated: ${currentStatus.status} → ${status}`);
    } else {
        console.log(`[ProgrammerStatus] ✅ Notes updated for programmer ${programmerId}`);
    }
}

/**
 * Check if programmer has any active tasks
 * Active = SEDANG_DIPROSES_USER or SEDANG_DIPROSES_USER_PAUSED
 */
export async function checkActiveTasks(programmerId: number): Promise<boolean> {
    const activeTasks = await prisma.tasklist.count({
        where: {
            pegawaiId: programmerId,
            status: {
                in: ['SEDANG_DIPROSES_USER', 'SEDANG_DIPROSES_USER_PAUSED'],
            },
        },
    });

    console.log(`[ProgrammerStatus] Programmer ${programmerId} has ${activeTasks} active task(s)`);
    return activeTasks > 0;
}

/**
 * Get active task info for notes field
 * Returns formatted string with project and task info
 */
export async function getActiveTaskInfo(programmerId: number): Promise<string | null> {
    const activeTasks = await prisma.tasklist.findMany({
        where: {
            pegawaiId: programmerId,
            status: {
                in: ['SEDANG_DIPROSES_USER', 'SEDANG_DIPROSES_USER_PAUSED'],
            },
        },
        include: {
            // Note: tasklist uses raw SQL, so we need to fetch project separately
        },
        orderBy: {
            startedAt: 'desc', // Most recent first
        },
        take: 1,
    });

    if (activeTasks.length === 0) {
        return null;
    }

    const task = activeTasks[0];

    // Fetch project info
    const project = await prisma.proyek.findUnique({
        where: { id: task.projectId },
        select: { namaProyek: true },
    });

    if (!project) {
        return `Task: ${task.kode}`;
    }

    // Count total active tasks
    const totalActiveTasks = await prisma.tasklist.count({
        where: {
            pegawaiId: programmerId,
            status: {
                in: ['SEDANG_DIPROSES_USER', 'SEDANG_DIPROSES_USER_PAUSED'],
            },
        },
    });

    const baseInfo = `Project: ${project.namaProyek} - Task: ${task.kode}`;

    if (totalActiveTasks > 1) {
        return `${baseInfo} (+${totalActiveTasks - 1} more)`;
    }

    return baseInfo;
}
