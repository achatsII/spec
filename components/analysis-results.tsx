"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Edit, Check, X } from "lucide-react"
import type { AnalysisResult, ExtractedField } from "@/types/analysis"

interface AnalysisResultsProps {
  result: AnalysisResult
  onResultUpdate: (result: AnalysisResult) => void
}

export default function AnalysisResults({ result, onResultUpdate }: AnalysisResultsProps) {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "bg-green-100 text-green-800"
    if (confidence >= 60) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  const startEdit = (fieldName: string, currentValue: string) => {
    setEditingField(fieldName)
    setEditValue(currentValue)
  }

  const saveEdit = (fieldPath: string) => {
    const updatedResult = { ...result }
    const pathParts = fieldPath.split(".")

    let current: any = updatedResult.extractedData
    for (let i = 0; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]]
    }

    current[pathParts[pathParts.length - 1]].valeur = editValue
    current[pathParts[pathParts.length - 1]].confiance = 100 // Manual edit = high confidence
    current[pathParts[pathParts.length - 1]].raison = "Modifié manuellement"

    onResultUpdate(updatedResult)
    setEditingField(null)
    setEditValue("")
  }

  const cancelEdit = () => {
    setEditingField(null)
    setEditValue("")
  }

  const renderField = (label: string, field: ExtractedField | undefined, fieldPath: string) => {
    // Handle undefined field
    if (!field) {
      field = { valeur: "Non spécifié", confiance: 0, raison: "Donnée manquante" }
    }

    const isEditing = editingField === fieldPath

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-medium">{label}</Label>
          <div className="flex items-center gap-2">
            <Badge className={getConfidenceColor(field.confiance || 0)}>{field.confiance || 0}%</Badge>
            {!isEditing && (
              <Button variant="ghost" size="sm" onClick={() => startEdit(fieldPath, field?.valeur || "")}>
                <Edit className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="flex gap-2">
            <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="flex-1" />
            <Button size="sm" onClick={() => saveEdit(fieldPath)}>
              <Check className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={cancelEdit}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="text-sm">
            <div className="font-medium">{field?.valeur || "Non spécifié"}</div>
            <div className="text-gray-500 text-xs">{field?.raison || "Aucune information"}</div>
          </div>
        )}
      </div>
    )
  }

  const renderDimension = (label: string, dimension: any, fieldPath: string) => {
    if (!dimension || !dimension.valeur) return null

    return (
      <div className="grid grid-cols-3 gap-2 items-center">
        <Label className="text-sm">{label}</Label>
        <div className="text-sm font-medium">
          {dimension.valeur} {dimension.unite}
        </div>
        <Badge className={getConfidenceColor(dimension.confiance)}>{dimension.confiance}%</Badge>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="text-sm text-gray-500">
        Fichier: {result.fileName} • {result.timestamp.toLocaleString()}
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderField("Référence", result.extractedData.reference, "reference")}
          {renderField("Description", result.extractedData.description, "description")}
          {renderField("Matériau", result.extractedData.material, "material")}
          {renderField("Type de pièce", result.extractedData.pieceType, "pieceType")}
        </CardContent>
      </Card>

      {/* Dimensions */}
      {result.extractedData.dimensions && Object.keys(result.extractedData.dimensions).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dimensions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.extractedData.dimensions.longueur &&
              renderDimension("Longueur", result.extractedData.dimensions.longueur, "dimensions.longueur")}
            {result.extractedData.dimensions.largeur &&
              renderDimension("Largeur", result.extractedData.dimensions.largeur, "dimensions.largeur")}
            {result.extractedData.dimensions.hauteur &&
              renderDimension("Hauteur", result.extractedData.dimensions.hauteur, "dimensions.hauteur")}
            {result.extractedData.dimensions.épaisseur &&
              renderDimension("Épaisseur", result.extractedData.dimensions.épaisseur, "dimensions.épaisseur")}
            {result.extractedData.dimensions.epaisseur &&
              renderDimension("Épaisseur", result.extractedData.dimensions.epaisseur, "dimensions.epaisseur")}
          </CardContent>
        </Card>
      )}

      {/* Processes */}
      {result.extractedData.processes && result.extractedData.processes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Procédés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.extractedData.processes.map((process, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">{process.valeur}</span>
                  <Badge className={getConfidenceColor(process.confiance)}>{process.confiance}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {result.extractedData.notes && result.extractedData.notes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes importantes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.extractedData.notes.map((note, index) => (
                <div key={index} className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm">{note.contenu}</div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">{note.raison}</span>
                    <Badge className={getConfidenceColor(note.confiance)}>{note.confiance}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Fields / Champs personnalisés */}
      {result.extractedData.customFields && Object.keys(result.extractedData.customFields).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Champs personnalisés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(result.extractedData.customFields).map(([fieldName, fieldData]: [string, any]) => {
                // Si c'est un tableau (comme les trous)
                if (Array.isArray(fieldData.valeur)) {
                  return (
                    <div key={fieldName} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm font-medium capitalize">{fieldName}</Label>
                        <Badge className={getConfidenceColor(fieldData.confiance || 0)}>
                          {fieldData.confiance || 0}%
                        </Badge>
                      </div>
                      <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                        {fieldData.valeur.map((item: any, index: number) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            {typeof item === "object" ? (
                              <div className="space-y-1 text-sm">
                                {Object.entries(item).map(([key, value]: [string, any]) => (
                                  <div key={key} className="flex justify-between">
                                    <span className="text-gray-600 capitalize">{key}:</span>
                                    <span className="font-medium">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm">{String(item)}</div>
                            )}
                          </div>
                        ))}
                      </div>
                      {fieldData.raison && (
                        <div className="text-xs text-gray-500">{fieldData.raison}</div>
                      )}
                    </div>
                  )
                }
                // Si c'est un objet simple
                return (
                  <div key={fieldName} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-medium capitalize">{fieldName}</Label>
                      <Badge className={getConfidenceColor(fieldData.confiance || 0)}>
                        {fieldData.confiance || 0}%
                      </Badge>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">
                        {typeof fieldData.valeur === "object"
                          ? JSON.stringify(fieldData.valeur, null, 2)
                          : String(fieldData.valeur)}
                      </div>
                      {fieldData.raison && (
                        <div className="text-gray-500 text-xs mt-1">{fieldData.raison}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
