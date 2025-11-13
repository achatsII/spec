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

    const fieldToUpdate = current[pathParts[pathParts.length - 1]]
    
    // Vérifier si c'est un objet ou tableau (vérifier la valeur originale)
    const isComplexValue = fieldToUpdate.valeur && (typeof fieldToUpdate.valeur === "object" || Array.isArray(fieldToUpdate.valeur))
    
    if (isComplexValue) {
      // Essayer de parser le JSON
      try {
        const parsed = JSON.parse(editValue)
        fieldToUpdate.valeur = parsed
      } catch (e) {
        // Si le parsing échoue, garder la valeur originale
        console.error("Erreur lors du parsing JSON:", e)
        alert("Format JSON invalide. Veuillez vérifier votre saisie.")
        return
      }
    } else if (fieldPath.startsWith("dimensions.") && fieldToUpdate.unite) {
      // Pour les dimensions, essayer de séparer la valeur et l'unité si l'utilisateur les a entrées ensemble
      const parts = editValue.trim().split(/\s+/)
      if (parts.length > 1) {
        fieldToUpdate.valeur = parts[0]
        fieldToUpdate.unite = parts.slice(1).join(" ")
      } else {
        fieldToUpdate.valeur = editValue
        // Garder l'unité existante
      }
    } else {
      fieldToUpdate.valeur = editValue
    }
    
    fieldToUpdate.confiance = 100 // Manual edit = high confidence
    fieldToUpdate.raison = "Modifié manuellement"

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

  // Fonction pour collecter tous les champs extraits (standards + dimensions + personnalisés)
  const getAllExtractedFields = () => {
    const fields: Array<{ name: string; label: string; data: any; path: string }> = []

    // Champs standards
    if (result.extractedData.reference) {
      fields.push({
        name: "reference",
        label: "Référence",
        data: result.extractedData.reference,
        path: "reference",
      })
    }
    if (result.extractedData.description) {
      fields.push({
        name: "description",
        label: "Description",
        data: result.extractedData.description,
        path: "description",
      })
    }
    if (result.extractedData.material) {
      fields.push({
        name: "material",
        label: "Matériau",
        data: result.extractedData.material,
        path: "material",
      })
    }
    if (result.extractedData.pieceType) {
      fields.push({
        name: "pieceType",
        label: "Type de pièce",
        data: result.extractedData.pieceType,
        path: "pieceType",
      })
    }

    // Dimensions
    if (result.extractedData.dimensions) {
      const dimensionLabels: Record<string, string> = {
        longueur: "Longueur",
        largeur: "Largeur",
        hauteur: "Hauteur",
        épaisseur: "Épaisseur",
        epaisseur: "Épaisseur",
      }
      Object.entries(result.extractedData.dimensions).forEach(([key, dimension]: [string, any]) => {
        if (dimension && dimension.valeur) {
          fields.push({
            name: key,
            label: dimensionLabels[key] || key,
            data: dimension,
            path: `dimensions.${key}`,
          })
        }
      })
    }

    // Champs personnalisés
    if (result.extractedData.customFields) {
      Object.entries(result.extractedData.customFields).forEach(([fieldName, fieldData]: [string, any]) => {
        fields.push({
          name: fieldName,
          label: fieldName,
          data: fieldData,
          path: `customFields.${fieldName}`,
        })
      })
    }

    return fields
  }

  const formatValueForDisplay = (value: any, unite?: string): string => {
    if (value === null || value === undefined) return "Non spécifié"
    
    // Si c'est un tableau
    if (Array.isArray(value)) {
      return `[${value.length} élément(s)]`
    }
    
    // Si c'est un objet
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2)
    }
    
    // Si c'est une string ou un nombre
    const stringValue = String(value)
    return unite ? `${stringValue} ${unite}` : stringValue
  }

  const renderFieldWithEdit = (field: { name: string; label: string; data: any; path: string }) => {
    const { label, data, path } = field
    const isEditing = editingField === path

    // Vérifier si la valeur est un objet ou un tableau
    const isComplexValue = data.valeur && (typeof data.valeur === "object" || Array.isArray(data.valeur))
    
    // Gérer les dimensions avec unité
    const displayValue = formatValueForDisplay(data.valeur, data.unite)
    const editInitialValue = isComplexValue ? JSON.stringify(data.valeur, null, 2) : displayValue

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-medium capitalize">{label}</Label>
          <div className="flex items-center gap-2">
            <Badge className={getConfidenceColor(data.confiance || 0)}>{data.confiance || 0}%</Badge>
            {!isEditing && (
              <Button variant="ghost" size="sm" onClick={() => startEdit(path, editInitialValue)}>
                <Edit className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="flex flex-col gap-2">
            {isComplexValue ? (
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 min-h-[100px] p-2 border rounded text-sm font-mono"
                placeholder={editInitialValue}
              />
            ) : (
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1"
                placeholder={displayValue}
              />
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => saveEdit(path)}>
                <Check className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" onClick={cancelEdit}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm">
            {isComplexValue ? (
              <div className="space-y-2">
                {Array.isArray(data.valeur) ? (
                  // Afficher un tableau d'objets
                  <div className="space-y-2">
                    {data.valeur.map((item: any, index: number) => (
                      <Card key={index} className="border-2 border-blue-100 bg-blue-50/30">
                        <CardContent className="p-3">
                          {typeof item === "object" ? (
                            <div className="space-y-1">
                              {Object.entries(item).map(([key, value]: [string, any]) => (
                                <div key={key} className="flex justify-between items-start gap-2">
                                  <span className="text-xs font-medium text-gray-600 capitalize">{key}:</span>
                                  <span className="text-sm font-semibold text-gray-900 text-right">
                                    {String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm font-medium">{String(item)}</div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  // Afficher un objet unique
                  <Card className="border-2 border-green-100 bg-green-50/30">
                    <CardContent className="p-3">
                      <div className="space-y-1">
                        {Object.entries(data.valeur).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex justify-between items-start gap-2">
                            <span className="text-xs font-medium text-gray-600 capitalize">{key}:</span>
                            <span className="text-sm font-semibold text-gray-900 text-right">
                              {String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="font-medium">{displayValue}</div>
            )}
            {data.raison && <div className="text-gray-500 text-xs mt-1">{data.raison}</div>}
          </div>
        )}
      </div>
    )
  }

  const allFields = getAllExtractedFields()

  return (
    <div className="space-y-4 pb-4">
      <div className="text-sm text-gray-500">
        Fichier: {result.fileName} • {result.timestamp.toLocaleString()}
      </div>

      {/* Tous les champs extraits dans une seule liste */}
      {allFields.length > 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {allFields.map((field) => (
                <div key={field.path}>{renderFieldWithEdit(field)}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500 text-sm py-4">
              Aucune donnée extraite
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
