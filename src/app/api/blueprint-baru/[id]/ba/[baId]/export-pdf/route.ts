import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; baId: string }> }
) {
  try {
    const { id, baId } = await params;
    const projectId = parseInt(id);
    const businessAnalystId = parseInt(baId);

    // Fetch project data
    const project = await prisma.proyek.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // Fetch BA with modules and tasks
    const ba = await prisma.bacara.findUnique({
      where: { id: businessAnalystId },
      include: {
        baModules: {
          include: {
            taskBAs: {
              include: {
                programmer: {
                  select: {
                    namaLengkap: true,
                  },
                },
              },
            },
          },
          orderBy: [{ level: "asc" }, { order: "asc" }],
        },
      },
    });

    if (!ba) {
      return NextResponse.json(
        { success: false, error: "BA not found" },
        { status: 404 }
      );
    }

    // Generate PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 25;

    // Load and add header image
    const imagePath = path.join(process.cwd(), "public", "images", "image.png");
    let headerImageData = null;

    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");
      headerImageData = `data:image/png;base64,${base64Image}`;
    } catch (error) {
      console.error("Error loading header image:", error);
    }

    // Function to add header to each page
    const addHeader = () => {
      if (headerImageData) {
        // Add image header - adjust dimensions as needed
        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = 20; // Adjust height as needed
        doc.addImage(headerImageData, "PNG", margin, 10, imgWidth, imgHeight);
      } else {
        // Fallback to text header if image not found
        doc.setFontSize(16);
        doc.setFont("times", "bold");
        doc.text("PT. SWA DIGITAL SOLUSINDO", pageWidth - margin, 20, { align: "right" });

        doc.setFontSize(10);
        doc.setFont("times", "normal");
        doc.text("Alamat : Jl. Permata Buana C-29 Surakarta", pageWidth - margin, 26, { align: "right" });
        doc.text("info@swadigitalsolusindo.com, Telp : 0271 - 7461770", pageWidth - margin, 31, { align: "right" });
      }
    };

    // Add header to first page
    addHeader();

    // Title
    doc.setFontSize(14);
    doc.setFont("times", "bold");
    const title = `BERITA ACARA ${project.namaProyek} - ${ba.nama}`;
    doc.text(title, pageWidth / 2, 35, { align: "center" }); // Beri jarak 5px dari header

    // Add underline to title
    const titleWidth = doc.getTextWidth(title);
    const titleX = (pageWidth - titleWidth) / 2;
    doc.setLineWidth(0.5);
    doc.line(titleX, 36, titleX + titleWidth, 36); // Garis underline 1px di bawah text

    // BA Number
    doc.setFontSize(12);
    const baNumber = `No : ${project.kodeProyek}`;
    doc.text(baNumber, pageWidth / 2, 42, { align: "center" }); // 7px di bawah title

    // Date and description
    doc.setFontSize(11);
    doc.setFont("times", "normal");
    const currentDate = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    let yPos = 48;

    // Add date line
    doc.text(`Tanggal: ${currentDate}`, margin, yPos);
    yPos += 8;

    // Add percentage legend
    doc.setFont("times", "bold");
    doc.text("Keterangan :", margin, yPos);
    yPos += 6;

    doc.setFont("times", "normal");
    doc.text("25% = Dalam Proses", margin, yPos);
    yPos += 5;
    doc.text("50% = Selesai Development", margin, yPos);
    yPos += 5;
    doc.text("100% = Selesai Demo", margin, yPos);
    yPos += 8;

    // Add total percentage line
    doc.setFont("times", "bold");
    doc.text("Total Persentase Pengerjaan = 100%", margin, yPos);
    yPos += 10;

    // Fetch Tasklists manually to avoid Prisma relation missing issues
    const tasklistIds: number[] = [];
    ba.baModules.forEach(mod => {
      if (mod.taskBAs) {
        mod.taskBAs.forEach((task: any) => {
          if (task.tasklistId) tasklistIds.push(task.tasklistId);
          // Legacy field support check just in case
          else if (task.tasklist_id) tasklistIds.push(task.tasklist_id);
        });
      }
    });

    const uniqueTasklistIds = Array.from(new Set(tasklistIds));
    const tasklists = uniqueTasklistIds.length > 0 ? await prisma.tasklist.findMany({
      where: { id: { in: uniqueTasklistIds } },
      select: { id: true, status: true, updatedAt: true }
    }) : [];
    
    const tasklistMap = new Map(tasklists.map(t => [t.id, t]));

    // Prepare table data
    const mainModules = ba.baModules.filter((m) => m.level === 1);
    const tableData: any[] = [];

    mainModules.forEach((mainModule) => {
      const subModules = ba.baModules.filter((m) => m.parentId === mainModule.id);
      const directTasks = mainModule.taskBAs || [];

      let isFirstMainPrinted = false;

      const printMainModuleName = () => {
        if (!isFirstMainPrinted) {
          isFirstMainPrinted = true;
          return mainModule.nama;
        }
        return "";
      };

      const getMainAppModuleStatus = () => {
        return (mainModule as any).isAppModule ? 'In Proyek' : '-';
      };

      if (subModules.length === 0 && directTasks.length === 0) {
        // No sub modules and no direct tasks
        tableData.push([
          printMainModuleName(),
          "-",
          getMainAppModuleStatus(),
          "-",
          "-",
          "-",
          "100%"
        ]);
      } else {
        // Handle direct tasks first
        if (directTasks.length > 0) {
          directTasks.forEach((task) => {
            const tasklistId = (task as any).tasklistId || (task as any).tasklist_id;
            const tl = tasklistId ? tasklistMap.get(tasklistId) : null;
            const startDate = task.jadwalMulai ? new Date(task.jadwalMulai).toLocaleDateString("id-ID") : "-";
            const endDate = tl?.status === 'SELESAI' && tl?.updatedAt ? new Date(tl.updatedAt).toLocaleDateString("id-ID") : "-";
            tableData.push([
              printMainModuleName(),
              "-",
              getMainAppModuleStatus(),
              task.nama,
              startDate,
              endDate,
              "100%"
            ]);
          });
        }

        // Handle sub modules
        subModules.forEach((subModule) => {
          const tasks = subModule.taskBAs || [];
          let isFirstSubPrinted = false;

          const printSubModuleName = () => {
            if (!isFirstSubPrinted) {
              isFirstSubPrinted = true;
              return subModule.nama;
            }
            return "";
          };

          const getSubAppModuleStatus = () => {
            return (subModule as any).isAppModule ? 'In Proyek' : '-';
          };

          if (tasks.length > 0) {
            tasks.forEach((task) => {
              const tasklistId = (task as any).tasklistId || (task as any).tasklist_id;
              const tl = tasklistId ? tasklistMap.get(tasklistId) : null;
              const startDate = task.jadwalMulai ? new Date(task.jadwalMulai).toLocaleDateString("id-ID") : "-";
              const endDate = tl?.status === 'SELESAI' && tl?.updatedAt ? new Date(tl.updatedAt).toLocaleDateString("id-ID") : "-";
              tableData.push([
                printMainModuleName(),
                printSubModuleName(),
                getSubAppModuleStatus(),
                task.nama,
                startDate,
                endDate,
                "100%"
              ]);
            });
          } else {
            tableData.push([
              printMainModuleName(),
              printSubModuleName(),
              getSubAppModuleStatus(),
              "-",
              "-",
              "-",
              "100%"
            ]);
          }
        });
      }
    });

    // Draw table
    autoTable(doc, {
      startY: yPos,
      head: [["Main Module", "Sub Module", "Module Status", "Task BA", "Jadwal Mulai", "Jadwal Akhir", "Keterangan"]],
      body: tableData,
      theme: "grid",
      styles: {
        fontSize: 9,
        cellPadding: 3,
        font: "times",
        halign: "left",
        valign: "middle",
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [200, 220, 240],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        halign: "center",
        valign: "middle",
      },
      columnStyles: {
        0: { cellWidth: 25, halign: "left" },
        1: { cellWidth: 24, halign: "left" },
        2: { cellWidth: 28, halign: "center" },
        3: { cellWidth: 20, halign: "left" },
        4: { cellWidth: 25, halign: "center" },
        5: { cellWidth: 25, halign: "center" },
        6: { cellWidth: 22, halign: "center" },
      },
      didDrawPage: (data) => {
        // Add header to each new page
        if (data.pageNumber > 1) {
          addHeader();
        }
      },
      margin: { top: 30, left: 20, right: 20 },
    });

    // Get final Y position after table
    const finalY = (doc as any).lastAutoTable.finalY || yPos + 50;

    // Set yPos for signature section
    yPos = finalY + 15;

    // Signature section
    const sigYPos = yPos;
    const leftX = margin + 20;
    const rightX = pageWidth - margin - 60;

    // Location and date
    doc.text(`${currentDate}`, margin, sigYPos);
    yPos = sigYPos + 10;

    // Left side - Mengetahui
    doc.text("Mengetahui,", leftX, yPos);
    doc.text(project.client || "-", leftX, yPos + 6);

    // Right side - Yang Membuat
    doc.text("Yang Membuat,", rightX, yPos);
    doc.text("PT. SWA DIGITAL SOLUSINDO", rightX, yPos + 6);

    // Signature lines (space for signatures)
    yPos += 40;

    // Names
    doc.setFont("times", "bold");
    doc.text("_____________________", leftX - 5, yPos);
    doc.text("_____________________", rightX - 5, yPos);

    yPos += 8;
    doc.setFont("times", "normal");
    doc.text(`PIC ${project.namaProyek}`, leftX + 5, yPos);
    doc.text("Implementator", rightX + 5, yPos);

    // Generate PDF as buffer
    const pdfBuffer = doc.output("arraybuffer");

    // Return PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="BA_${ba.nama}_${ba.version}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
