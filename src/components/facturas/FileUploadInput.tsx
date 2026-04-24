"use client"

import { useState } from "react"
import { Upload, File, HelpCircle } from "lucide-react"

export function FileUploadInput({ name }: { name: string }) {
    const [fileName, setFileName] = useState<string | null>(null)

    return (
        <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-zinc-500 flex items-center gap-2">
                Soporte Físico (Opcional)
                <span title="PDF o Imagen de la factura física">
                    <HelpCircle className="w-3 h-3 text-zinc-400" />
                </span>

            </label>
            <div className="relative group">
                <input 
                    type="file" 
                    name={name}
                    accept="image/*,.pdf"
                    onChange={(e) => {
                        const file = e.target.files?.[0]
                        setFileName(file ? file.name : null)
                    }}
                    className="w-full h-11 cursor-pointer opacity-0 absolute inset-0 z-10" 
                />
                <div className={`w-full h-11 border border-dashed rounded-xl flex items-center px-4 gap-3 transition-all ${
                    fileName 
                    ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-500/5' 
                    : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/20 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-900'
                }`}>
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                        fileName ? 'bg-indigo-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                    }`}>
                        {fileName ? <File className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                    </div>
                    <span className={`text-xs truncate font-medium ${fileName ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`}>
                        {fileName || 'Seleccionar archivo PDF o Imagen...'}
                    </span>
                    {fileName && (
                         <div className="ml-auto text-[10px] font-bold text-indigo-500 uppercase tracking-tighter">LISTO</div>
                    )}
                </div>
            </div>
        </div>
    )
}
