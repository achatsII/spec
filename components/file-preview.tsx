"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Image as ImageIcon, Loader2 } from "lucide-react"

interface FilePreviewProps {
  file: File | null
  fileUrl?: string
}

export default function FilePreview({ file, fileUrl }: FilePreviewProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [fileType, setFileType] = useState<"pdf" | "image" | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (file) {
      setIsLoading(true)
      const type = file.type

      if (type === "application/pdf") {
        setFileType("pdf")
        // Pour les PDF, créer un URL object
        const url = URL.createObjectURL(file)
        setPreview(url)
        setIsLoading(false)
      } else if (type.startsWith("image/")) {
        setFileType("image")
        // Pour les images, créer une data URL
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreview(reader.result as string)
          setIsLoading(false)
        }
        reader.readAsDataURL(file)
      } else {
        setFileType(null)
        setPreview(null)
        setIsLoading(false)
      }

      // Cleanup
      return () => {
        if (preview) {
          URL.revokeObjectURL(preview)
        }
      }
    } else if (fileUrl) {
      setIsLoading(true)
      // Déterminer le type à partir de l'URL
      if (fileUrl.toLowerCase().endsWith(".pdf")) {
        setFileType("pdf")
        setPreview(fileUrl)
      } else if (
        fileUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i)
      ) {
        setFileType("image")
        setPreview(fileUrl)
      }
      setIsLoading(false)
    } else {
      setPreview(null)
      setFileType(null)
    }
  }, [file, fileUrl])

  if (!file && !fileUrl) {
    return (
      <Card className="border-dashed border-2 border-gray-300">
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Aucun fichier sélectionné</p>
          <p className="text-sm text-gray-400">L'aperçu apparaîtra ici</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-12 w-12 mx-auto text-[#0078FF] animate-spin mb-4" />
          <p className="text-gray-500">Chargement de l'aperçu...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-[#0078FF]/20">
      <CardHeader className="bg-[#0078FF]/5">
        <CardTitle className="flex items-center gap-2 text-[#0078FF] text-base">
          {fileType === "pdf" ? <FileText className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
          Aperçu du fichier
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {fileType === "pdf" && preview && (
          <div className="w-full" style={{ height: "600px" }}>
            <iframe
              src={preview}
              className="w-full h-full border-0"
              title="Aperçu PDF"
            />
          </div>
        )}

        {fileType === "image" && preview && (
          <div className="w-full p-4">
            <img
              src={preview}
              alt="Aperçu du plan"
              className="w-full h-auto max-h-[600px] object-contain rounded-lg"
            />
          </div>
        )}

        {!fileType && (
          <div className="py-12 text-center text-gray-500">
            <p>Format de fichier non supporté pour l'aperçu</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
