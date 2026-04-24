import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { join } from "path"
import { readFile } from "fs/promises"
import { enforceCompanyScope } from "@/lib/permissions"

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await auth()
    if (!session?.user) return new NextResponse("No autorizado", { status: 401 })

    const invoice = await prisma.invoice.findUnique({
        where: { id: params.id }
    })

    if (!invoice || !invoice.attachmentKey) {
        return new NextResponse("Archivo no encontrado", { status: 404 })
    }

    try {
        // Validación de Seguridad Multi-tenant
        enforceCompanyScope(session.user, invoice.companyId)
        
        const filePath = join(process.cwd(), "uploads", invoice.attachmentKey)
        const fileBuffer = await readFile(filePath)
        
        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": "application/octet-stream",
                "Content-Disposition": `attachment; filename="${invoice.attachmentName || 'soporte-factura'}"`
            }
        })
    } catch (e: any) {
        return new NextResponse(e.message || "Error al recuperar archivo", { status: 403 })
    }
}
