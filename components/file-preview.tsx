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
    <div className="w-full h-full flex flex-col min-h-[600px]">
      {fileType === "pdf" && preview && (
        <div className="w-full h-full flex-1 min-h-[600px]">
          <iframe
            src={preview}
            className="w-full h-full border-0 rounded-lg"
            title="Aperçu PDF"
          />
        </div>
      )}

      {fileType === "image" && preview && (
        <div className="w-full h-full flex-1 min-h-[600px] flex items-center justify-center p-2">
          <img
            src={preview}
            alt="Aperçu du plan"
            className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg"
          />
        </div>
      )}

      {!fileType && (
        <div className="w-full h-full min-h-[600px] flex items-center justify-center text-center text-gray-500">
          <div>
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p>Aucun fichier sélectionné</p>
            <p className="text-sm text-gray-400">L'aperçu apparaîtra ici</p>
          </div>
        </div>
      )}
    </div>
  )
}
