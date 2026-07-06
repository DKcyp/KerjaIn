
import React from 'react';
import { prisma } from '@/lib/prisma';
import MonitoringClient from './MonitoringClient';

export const metadata = {
    title: 'Monitoring | Richz-Log',
    description: 'Project Monitoring Dashboard',
};

export default async function MonitoringPage() {
    // No authentication required for monitoring page
    // const session = await getServerSession();
    // const user = session?.user;

    let whereCondition: any = {};

    // If user is PM, validasi hanya project yang dipegang
    // Role filtering removed as per request to show all projects for all users
    // if (user?.role === 'PM') { ... }

    // Fetch projects for the filter
    const projects = await prisma.proyek.findMany({
        where: whereCondition,
        select: {
            id: true,
            namaProyek: true,
        },
        orderBy: {
            namaProyek: 'asc',
        },
    });

    return <MonitoringClient projects={projects} />;
}
