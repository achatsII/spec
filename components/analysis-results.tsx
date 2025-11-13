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

  // Fonction pour collecter uniquement les champs extractables définis dans le profil d'extraction
  const getAllExtractedFields = () => {
    const fields: Array<{ name: string; label: string; data: any; path: string }> = []

    // Uniquement les champs personnalisés (définis dans le profil d'extraction)
    if (result.extractedData.customFields) {
      Object.entries(result.extractedData.customFields).forEach(([fieldName, fieldData]: [string, any]) => {
        // Donner un label plus joli pour la quantité
        let displayLabel = fieldName
        if (fieldName === "quantite" || fieldName === "quantité") {
          displayLabel = "📦 Quantité de pièces"
        }

        fields.push({
          name: fieldName,
          label: displayLabel,
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <Label className="text-xs sm:text-sm font-medium capitalize break-words">{label}</Label>
          <div className="flex items-center gap-2">
            <Badge className={`text-xs ${getConfidenceColor(data.confiance || 0)}`}>{data.confiance || 0}%</Badge>
            {!isEditing && (
              <Button variant="ghost" size="sm" onClick={() => startEdit(path, editInitialValue)} className="h-7 w-7 p-0">
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
                className="flex-1 min-h-[100px] p-2 border rounded text-xs sm:text-sm font-mono w-full"
                placeholder={editInitialValue}
              />
            ) : (
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 text-xs sm:text-sm"
                placeholder={displayValue}
              />
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => saveEdit(path)} className="h-7 text-xs">
                <Check className="h-3 w-3 mr-1" />
                Valider
              </Button>
              <Button size="sm" variant="outline" onClick={cancelEdit} className="h-7 text-xs">
                <X className="h-3 w-3 mr-1" />
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-xs sm:text-sm">
            {isComplexValue ? (
              <div className="space-y-2">
                {Array.isArray(data.valeur) ? (
                  // Afficher un tableau d'objets
                  <div className="space-y-2">
                    {data.valeur.map((item: any, index: number) => (
                      <Card key={index} className="border-2 border-blue-100 bg-blue-50/30">
                        <CardContent className="p-2 sm:p-3">
                          {typeof item === "object" ? (
                            <div className="space-y-1">
                              {Object.entries(item).map(([key, value]: [string, any]) => (
                                <div key={key} className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-2">
                                  <span className="text-xs font-medium text-gray-600 capitalize">{key}:</span>
                                  <span className="text-xs sm:text-sm font-semibold text-gray-900 sm:text-right break-words">
                                    {String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs sm:text-sm font-medium break-words">{String(item)}</div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  // Afficher un objet unique
                  <Card className="border-2 border-green-100 bg-green-50/30">
                    <CardContent className="p-2 sm:p-3">
                      <div className="space-y-1">
                        {Object.entries(data.valeur).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-2">
                            <span className="text-xs font-medium text-gray-600 capitalize">{key}:</span>
                            <span className="text-xs sm:text-sm font-semibold text-gray-900 sm:text-right break-words">
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
              <div className="font-medium break-words">{displayValue}</div>
            )}
            {data.raison && <div className="text-gray-500 text-xs mt-1 break-words">{data.raison}</div>}
          </div>
        )}
      </div>
    )
  }

  const allFields = getAllExtractedFields()

  return (
    <div className="space-y-4 w-full">
      <div className="text-xs sm:text-sm text-gray-500 break-words">
        <div className="font-medium mb-1">Fichier: {result.fileName}</div>
        <div>{result.timestamp.toLocaleString()}</div>
      </div>

      {/* Tous les champs extraits dans une seule liste */}
      {allFields.length > 0 ? (
        <Card>
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="space-y-3 sm:space-y-4">
              {allFields.map((field) => (
                <div key={field.path}>{renderFieldWithEdit(field)}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="text-center text-gray-500 text-xs sm:text-sm py-4">
              Aucune donnée extraite
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
