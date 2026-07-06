import { prisma } from '@/lib/prisma';
import { SlaType } from '@prisma/client';

/**
 * Determines task complexity (EASY/MEDIUM/HARD) from custom duration hours
 * by querying task_complexity table and comparing against configured thresholds.
 * 
 * Example:
 * - If EASY=2h, MEDIUM=4h, HARD=8h in database
 * - customHours=3 → returns MEDIUM (3 is between 2 and 4)
 * - customHours=5 → returns HARD (5 is >= 4)
 * 
 * @param customHours - The custom duration in hours
 * @returns The determined complexity level (EASY, MEDIUM, or HARD)
 */
export async function determineComplexityFromHours(customHours: number): Promise<SlaType> {
    try {
        // Get all complexity configurations sorted by hours (ascending)
        const complexities = await prisma.taskComplexity.findMany({
            where: { isActive: true },
            orderBy: { hours: 'asc' }
        });

        if (complexities.length === 0) {
            console.warn('No task complexity configurations found, defaulting to MEDIUM');
            return 'MEDIUM';
        }

        // Find the appropriate complexity level
        // Logic: use the highest complexity where customHours >= threshold
        let selectedComplexity: SlaType = complexities[0].complexity;

        for (const config of complexities) {
            if (customHours >= config.hours) {
                selectedComplexity = config.complexity;
            } else {
                // Once we find a threshold greater than customHours, stop
                break;
            }
        }

        console.log(`Determined complexity from ${customHours} hours: ${selectedComplexity}`);
        return selectedComplexity;
    } catch (error) {
        console.error('Error determining complexity from hours:', error);
        // Fallback to MEDIUM on error
        return 'MEDIUM';
    }
}
