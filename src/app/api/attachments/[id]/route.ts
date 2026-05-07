import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { enforceCompanyScope } from "@/lib/permissions"
import { r2Client, BUCKET_NAME } from "@/lib/r2"
import { GetObjectCommand } from "@aws-sdk/client-s3"

/**
 * API para recuperar adjuntos de Facturas o Ingresos de forma segura.
 * Elimina la dependencia del sistema de archivos local y usa Cloudflare R2.
 */
export async function GET(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params
    const searchParams = req.nextUrl.searchParams
    const type = searchParams.get("type") || "invoice" // "invoice" o "income"
    
    const session = await auth()
    if (!session?.user) return new NextResponse("No autorizado", { status: 401 })

    const supabase = await createClient()
    const id = Number(params.id)

    let movement: any = null
    let error: any = null

    // 1. Buscar el movimiento según el tipo
    if (type === "income") {
        const { data, error: iError } = await supabase
            .from('Income')
            .select('*')
            .eq('id', id)
            .single()
        movement = data
        error = iError
    } else {
        const { data, error: vError } = await supabase
            .from('Invoice')
            .select('*')
            .eq('id', id)
            .single()
        movement = data
        error = vError
    }

    if (error || !movement || !movement.attachmentKey) {
        return new NextResponse("Archivo no encontrado", { status: 404 })
    }

    try {
        // 2. Validación de Seguridad Multi-tenant
        enforceCompanyScope(session.user, movement.companyId)
        
        // 3. Obtener de Cloudflare R2
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: movement.attachmentKey,
        })

        const response = await r2Client.send(command)
        
        if (!response.Body) {
            throw new Error("El cuerpo del archivo está vacío")
        }

        // Convertir ReadableStream a Response body
        const stream = response.Body as any

        return new NextResponse(stream, {
            headers: {
                "Content-Type": response.ContentType || "application/octet-stream",
                "Content-Disposition": `attachment; filename="${movement.attachmentName || 'archivo-soporte'}"`,
                "Cache-Control": "private, max-age=3600"
            }
        })
    } catch (e: any) {
        console.error("Error en descarga R2:", e)
        return new NextResponse(e.message || "Error al recuperar archivo", { status: 403 })
    }
}
