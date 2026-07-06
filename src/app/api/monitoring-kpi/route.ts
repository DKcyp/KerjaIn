import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getJadwalByRange } from "@/lib/richzspotService";
import { getUserBreakTime } from "@/lib/breakTimeService";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const startDateForJadwal = startDate || "2000-01-01";
    const endDateForJadwal = endDate || new Date().toISOString().split('T')[0];

    // Ambil semua pegawai dengan ssoUserId
    const allPegawai: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, "namaLengkap", role, "ssoUserId" FROM "public"."pegawai" ORDER BY "namaLengkap" LIMIT 1000 OFFSET 0`
    );

    // Filter pegawai yang ada jadwalnya via RichzSpot API
    const results = await Promise.allSettled(
      allPegawai.map(async (p: any) => {
        if (!p.ssoUserId) return null;
        const jadwalData = await getJadwalByRange(startDateForJadwal, endDateForJadwal, { ssoUserId: p.ssoUserId });
        if (!jadwalData || jadwalData.length === 0) return null;
        const validEntries = jadwalData.filter((item: any) => item.shift_jam_masuk && item.shift_jam_pulang);
        if (validEntries.length === 0) return null;

        const breakTime = await getUserBreakTime(p.id);
        let totalWorkingMinutes = 0;

        for (const raw of validEntries) {
          const item = raw as any;
          const [startH, startM] = item.shift_jam_masuk.substring(0, 5).split(':').map(Number);
          const [endH, endM] = item.shift_jam_pulang.substring(0, 5).split(':').map(Number);
          const shiftStartMin = startH * 60 + startM;
          const shiftEndMin = endH * 60 + endM;
          let dayMinutes = shiftEndMin - shiftStartMin;

          if (breakTime) {
            const [bsh, bsm] = breakTime.startTime.split(':').map(Number);
            const [beh, bem] = breakTime.endTime.split(':').map(Number);
            const breakStartMin = bsh * 60 + bsm;
            const breakEndMin = beh * 60 + bem;
            const overlapStart = Math.max(shiftStartMin, breakStartMin);
            const overlapEnd = Math.min(shiftEndMin, breakEndMin);
            if (overlapEnd > overlapStart) {
              dayMinutes -= (overlapEnd - overlapStart);
            }
          }

          if (dayMinutes > 0) totalWorkingMinutes += dayMinutes;
        }

        return {
          pegawai: p,
          jamAbsen: Math.round((totalWorkingMinutes / 60) * 10) / 10,
        };
      })
    );

    const pegawaiList: any[] = [];
    const jamAbsenMap: Record<number, number> = {};

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        const ja = result.value.jamAbsen;
        // skip unreasonably high jamAbsen (API data issue = combined all users) and zero
        // 186.3 is combined data from all users - filter at 180
        if (ja === 0 || ja >= 180) continue;
        pegawaiList.push(result.value.pegawai);
        jamAbsenMap[result.value.pegawai.id] = ja;
      }
    }

    if (pegawaiList.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const pegawaiIds = pegawaiList.map((p: any) => p.id);
    const pegawaiIdList = pegawaiIds.join(",");

    // Build date filter clause
    let dateClause = "";
    const params: any[] = [];
    let paramIdx = 1;

    if (startDate) {
      dateClause += ` AND t."updatedAt" >= $${paramIdx}::timestamp`;
      params.push(startDate);
      paramIdx++;
    }
    if (endDate) {
      dateClause += ` AND t."updatedAt" <= $${paramIdx}::timestamp`;
      params.push(endDate + " 23:59:59");
      paramIdx++;
    }

    // Ambil tasklist filtered by date AND pegawaiIds
    const tasklists: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        t.id,
        t."pegawaiId",
        t.status,
        t."calculatedDueDate",
        t."scheduleAt",
        t."updatedAt",
        (
          COALESCE(
            (
              SELECT MIN(tl.waktu)
              FROM tasklist_log tl
              WHERE tl."taskId" = t.id
                AND tl."action" = 'STATUS_CHANGE'
                AND tl.keterangan LIKE '%Task dikirim untuk review%'
            ),
            (
              SELECT MIN(tl.waktu) - INTERVAL '7 hours'
              FROM tasklist_log tl
              WHERE tl."taskId" = t.id
                AND tl."action" = 'STATUS_CHANGE'
                AND tl.keterangan LIKE '%telah dikirim menunggu review%'
            )
          )
        ) as "sentForReviewAt"
      FROM tasklist t
      WHERE t."pegawaiId" IN (${pegawaiIdList})${dateClause}
    `, ...params);

    // Ambil count revisi per pegawai (filtered by same date range via tasklist)
    let revisiDateClause = "";
    const revisiParams: any[] = [];
    let revisiParamIdx = 1;

    if (startDate) {
      revisiDateClause += ` AND t."updatedAt" >= $${revisiParamIdx}::timestamp`;
      revisiParams.push(startDate);
      revisiParamIdx++;
    }
    if (endDate) {
      revisiDateClause += ` AND t."updatedAt" <= $${revisiParamIdx}::timestamp`;
      revisiParams.push(endDate + " 23:59:59");
      revisiParamIdx++;
    }

    const revisiData: any[] = await prisma.$queryRawUnsafe(`
      SELECT t."pegawaiId", COUNT(*)::int as revisi_count
      FROM tasklist_log tl
      JOIN tasklist t ON tl."taskId" = t.id
      WHERE tl."action" = 'STATUS_CHANGE'
        AND tl."keterangan" ILIKE '%reject%'
        AND t."pegawaiId" IN (${pegawaiIdList})${revisiDateClause}
      GROUP BY t."pegawaiId"
    `, ...revisiParams);

    // Group tasklist per pegawaiId
    const kpiMap: Record<number, { ts: number; tt: number; tw: number; jamTasklist: number; revisi: number }> = {};

    for (const task of tasklists) {
      const pid: number = task.pegawaiId;
      if (!pid) continue;

      if (!kpiMap[pid]) {
        kpiMap[pid] = { ts: 0, tt: 0, tw: 0, jamTasklist: 0, revisi: 0 };
      }

      kpiMap[pid].tt += 1;

      if (task.status === "SELESAI") {
        kpiMap[pid].ts += 1;

        // Cek tepat waktu: sentForReviewAt - 7h <= calculatedDueDate
        if (task.sentForReviewAt && task.calculatedDueDate) {
          const reviewDate = new Date(task.sentForReviewAt);
          reviewDate.setHours(reviewDate.getHours() - 7);
          const dueDate = new Date(task.calculatedDueDate);
          if (reviewDate <= dueDate) {
            kpiMap[pid].tw += 1;
          }
        }

        // Hitung waktu pengerjaan: sentForReviewAt - scheduleAt (dalam jam)
        if (task.sentForReviewAt && task.scheduleAt) {
          const sent = new Date(task.sentForReviewAt);
          const schedule = new Date(task.scheduleAt);
          const diffMs = sent.getTime() - schedule.getTime();
          if (diffMs > 0) {
            kpiMap[pid].jamTasklist += diffMs / (1000 * 60 * 60);
          }
        }
      }
    }

    // Merge revisi data ke kpiMap
    for (const row of revisiData) {
      const pid: number = row.pegawaiId;
      if (kpiMap[pid]) {
        kpiMap[pid].revisi = row.revisi_count;
      }
    }

    // Format response hanya untuk pegawai yang ada jadwal
    const data = pegawaiList.map((p: any) => {
      const jamAbsen = jamAbsenMap[p.id] || 0;
      const kpi = kpiMap[p.id];

      if (!kpi) {
        return {
          pegawaiId: p.id,
          nama: p.namaLengkap,
          role: p.role,
          totalTasklistSelesai: 0,
          totalTasklist: 0,
          persenSelesai: 0,
          kpiSelesai: 0,
          totalTepatWaktu: 0,
          totalSelesaiUntukTW: 0,
          persenTepatWaktu: 0,
          kpiTepatWaktu: 0,
          totalJamTasklist: 0,
          totalJamAbsen: jamAbsen,
          persenWaktu: 0,
          kpiWaktu: 0,
          totalAksiRevisi: 0,
          totalSelesaiUntukRevisi: 0,
          persenRevisi: 0,
          kpiRevisi: 0,
          grandTotal: 0,
        };
      }

      // Task Selesai
      const totalSelesai = kpi.tt > 0 ? (kpi.ts / kpi.tt) * 100 : 0;
      const kpiSelesai = totalSelesai * 0.3;

      // Task Tepat Waktu
      const totalTW = kpi.ts > 0 ? (kpi.tw / kpi.ts) * 100 : 0;
      const kpiTW = totalTW * 0.4;

      // Waktu Pengerjaan
      const persenWaktu = jamAbsen > 0 ? (kpi.jamTasklist / jamAbsen) * 100 : 0;
      const kpiWaktu = persenWaktu * 0.2;

      // Total Revisi
      const totalRevisi = kpi.ts > 0 ? Math.max(0, (1 - (kpi.revisi / kpi.ts)) * 100) : 0;
      const kpiRevisi = totalRevisi * 0.1;

      const grandTotal = kpiSelesai + kpiTW + kpiWaktu + kpiRevisi;

      return {
        pegawaiId: p.id,
        nama: p.namaLengkap,
        role: p.role,
        totalTasklistSelesai: kpi.ts,
        totalTasklist: kpi.tt,
        persenSelesai: Math.round(totalSelesai * 100) / 100,
        kpiSelesai: Math.round(kpiSelesai * 100) / 100,
        totalTepatWaktu: kpi.tw,
        totalSelesaiUntukTW: kpi.ts,
        persenTepatWaktu: Math.round(totalTW * 100) / 100,
        kpiTepatWaktu: Math.round(kpiTW * 100) / 100,
        totalJamTasklist: Math.round(kpi.jamTasklist * 100) / 100,
        totalJamAbsen: jamAbsen,
        persenWaktu: Math.round(persenWaktu * 100) / 100,
        kpiWaktu: Math.round(kpiWaktu * 100) / 100,
        totalAksiRevisi: kpi.revisi,
        totalSelesaiUntukRevisi: kpi.ts,
        persenRevisi: Math.round(totalRevisi * 100) / 100,
        kpiRevisi: Math.round(kpiRevisi * 100) / 100,
        grandTotal: Math.round(grandTotal * 100) / 100,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching monitoring KPI:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data monitoring KPI" },
      { status: 500 }
    );
  }
}
