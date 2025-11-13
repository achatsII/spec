"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Image as ImageIcon, Loader2, ZoomIn, ZoomOut, Maximize2 } from "lucide-react"

interface FilePreviewProps {
  file: File | null
  fileUrl?: string
  enableZoom?: boolean // Option pour activer le zoom
}

export default function FilePreview({ file, fileUrl, enableZoom = false }: FilePreviewProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [fileType, setFileType] = useState<"pdf" | "image" | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [zoom, setZoom] = useState(100) // Zoom en pourcentage
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 })
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null)

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

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 300)) // Max 300%
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50)) // Min 50%
  }

  const handleResetZoom = () => {
    setZoom(100)
    // Reset scroll position
    if (containerRef) {
      containerRef.scrollLeft = 0
      containerRef.scrollTop = 0
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoom > 100 && containerRef) {
      setIsDragging(true)
      setDragStart({ x: e.clientX, y: e.clientY })
      setScrollStart({ x: containerRef.scrollLeft, y: containerRef.scrollTop })
      e.preventDefault()
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging && containerRef) {
      const dx = e.clientX - dragStart.x
      const dy = e.clientY - dragStart.y
      containerRef.scrollLeft = scrollStart.x - dx
      containerRef.scrollTop = scrollStart.y - dy
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  return (
    <div className="w-full h-full flex flex-col min-h-[600px] relative">
      {/* Contrôles de zoom */}
      {enableZoom && fileType === "image" && preview && (
        <div className="absolute top-4 right-4 z-10 flex gap-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 50}
            className="h-8 w-8 p-0"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetZoom}
            className="h-8 px-2 text-xs font-mono"
          >
            {zoom}%
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 300}
            className="h-8 w-8 p-0"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      )}

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
        <div
          ref={setContainerRef}
          className={`w-full h-full flex-1 min-h-[600px] overflow-auto bg-gray-50 rounded-lg ${
            zoom > 100 ? "cursor-grab active:cursor-grabbing" : ""
          } ${isDragging ? "cursor-grabbing select-none" : ""}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          <div
            className="flex items-center justify-center p-2"
            style={{
              minWidth: "100%",
              minHeight: "100%",
              width: `${zoom}%`,
              height: `${zoom}%`,
            }}
          >
            <img
              src={preview}
              alt="Aperçu du plan"
              className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg pointer-events-none"
              draggable={false}
            />
          </div>
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
