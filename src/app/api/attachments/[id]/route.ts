import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { join } from "path"
import { readFile } from "fs/promises"
import { enforceCompanyScope } from "@/lib/permissions"

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await auth()
    if (!session?.user) return new NextResponse("No autorizado", { status: 401 })

    const supabase = createClient()
    const { data: invoice, error } = await supabase
        .from('Invoice')
        .select('*')
        .eq('id', Number(params.id))
        .single()

    if (error || !invoice || !invoice.attachmentKey) {
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
