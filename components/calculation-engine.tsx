"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Calculator } from "lucide-react"
import { evaluate } from "mathjs"
import type { AnalysisResult, ExtractionProfile, CalculationResult, RawMaterial, FormulaResult } from "@/types/analysis"

interface ExtendedCalculationResult extends CalculationResult {
  materialId: string
}

interface CalculationEngineProps {
  analysisResult: AnalysisResult
  clientProfile: ExtractionProfile
  onCalculationComplete: (result: CalculationResult) => void
  isCalculating: boolean
  setIsCalculating: (calculating: boolean) => void
}

export default function CalculationEngine({
  analysisResult,
  clientProfile,
  onCalculationComplete,
  isCalculating,
  setIsCalculating,
}: CalculationEngineProps) {
  const [compatibleMaterials, setCompatibleMaterials] = useState<RawMaterial[]>([])
  const [allCalculationResults, setAllCalculationResults] = useState<ExtendedCalculationResult[]>([])
  const [selectedResult, setSelectedResult] = useState<ExtendedCalculationResult | null>(null)
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false)

  useEffect(() => {
    loadMaterials()
  }, [analysisResult, clientProfile])

  const loadMaterials = async () => {
    setIsLoadingMaterials(true)
    try {
      const response = await fetch("/api/raw-materials")
      const data = await response.json()

      if (data.success && Array.isArray(data.materials)) {
        // Filter materials based on profile compatibility or piece type
        const pieceType = analysisResult.extractedData.pieceType.valeur.toLowerCase()
        const materialType = analysisResult.extractedData.material.valeur.toLowerCase()

        let filtered = data.materials

        // If profile has compatible material IDs, use them
        if (clientProfile.compatibleMaterialIds && clientProfile.compatibleMaterialIds.length > 0) {
          filtered = data.materials.filter((m: RawMaterial) =>
            clientProfile.compatibleMaterialIds?.includes(m.id)
          )
        } else {
          // Otherwise, filter by category and material
          filtered = data.materials.filter((m: RawMaterial) => {
            const category = m.category?.toLowerCase() || ""
            const material = m.material?.toLowerCase() || ""
            return (
              category.includes(pieceType) ||
              material.includes(materialType) ||
              (pieceType === "tube" && category.includes("tube")) ||
              (pieceType === "plat" && category.includes("plat"))
            )
          })
        }

        // If no match, use all materials
        if (filtered.length === 0) {
          filtered = data.materials
        }

        setCompatibleMaterials(filtered)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des matériaux:", error)
      setCompatibleMaterials([])
    } finally {
      setIsLoadingMaterials(false)
    }
  }

  const performAllCalculations = async () => {
    if (compatibleMaterials.length === 0) {
      alert("Aucun matériau disponible pour le calcul")
      return
    }

    setIsCalculating(true)
    setAllCalculationResults([])
    setSelectedResult(null)

    try {
      const dimensions = analysisResult.extractedData.dimensions || {}
      const longueurPiece = dimensions.longueur?.valeur
        ? Number.parseFloat(dimensions.longueur.valeur.toString().replace(/[^\d.-]/g, "")) || 0
        : 0

      const largeur = dimensions.largeur?.valeur
        ? Number.parseFloat(dimensions.largeur.valeur.toString().replace(/[^\d.-]/g, "")) || 0
        : 0

      const hauteur = dimensions.hauteur?.valeur
        ? Number.parseFloat(dimensions.hauteur.valeur.toString().replace(/[^\d.-]/g, "")) || 0
        : 0

      const processes = (analysisResult.extractedData.processes || []).map((p) => p?.valeur || "")

      if (longueurPiece <= 0) {
        alert("Attention: La longueur de la pièce n'est pas définie ou invalide.")
        setIsCalculating(false)
        return
      }

      const allResults: ExtendedCalculationResult[] = []

      // Select best material for detailed calculations
      const bestMaterial = compatibleMaterials[0] || null

      if (bestMaterial) {
        // Build variables object with all extracted data
        const variables: Record<string, any> = {
          longueur: longueurPiece,
          largeur: largeur,
          hauteur: hauteur,
          longueur_barre: bestMaterial.standardLength,
          cout_materiau: bestMaterial.costPerUnit,
        }

        // Add custom fields to variables with support for complex structures
        if (analysisResult.extractedData.customFields) {
          Object.entries(analysisResult.extractedData.customFields).forEach(([key, value]) => {
            if (value && typeof value === "object" && "valeur" in value) {
              const fieldValue = value.valeur
              
              // Handle array values (e.g., trous as array of objects)
              if (Array.isArray(fieldValue) && fieldValue.length > 0) {
                // Extract properties from array items for formula access
                // Example: trous.quantite, trous.diametre
                const firstItem = fieldValue[0]
                if (typeof firstItem === "object") {
                  // Create a flattened object with aggregated values
                  const aggregated: Record<string, any> = {}
                  
                  // Sum quantities if present
                  const totalQuantite = fieldValue.reduce((sum, item) => {
                    if (typeof item === "object" && "quantite" in item) {
                      return sum + (Number.parseFloat(item.quantite) || 0)
                    }
                    return sum
                  }, 0)
                  if (totalQuantite > 0) aggregated.quantite = totalQuantite
                  
                  // Average diameter if present
                  const diameters = fieldValue
                    .map((item) => {
                      if (typeof item === "object" && "diametre" in item) {
                        return Number.parseFloat(item.diametre)
                      }
                      return null
                    })
                    .filter((d) => d !== null && !isNaN(d))
                  if (diameters.length > 0) {
                    aggregated.diametre = diameters.reduce((a, b) => a + b, 0) / diameters.length
                  }
                  
                  // Store array length
                  aggregated.length = fieldValue.length
                  
                  // Store the full array
                  variables[key] = aggregated
                  
                  // Also add direct access to aggregated values
                  Object.entries(aggregated).forEach(([prop, val]) => {
                    variables[`${key}.${prop}`] = val
                  })
                } else {
                  // Simple array of numbers/strings
                  variables[key] = fieldValue
                  variables[`${key}.length`] = fieldValue.length
                }
              } else if (typeof fieldValue === "object" && !Array.isArray(fieldValue)) {
                // Complex object structure
                variables[key] = fieldValue
                // Add flattened access to properties
                Object.entries(fieldValue).forEach(([prop, val]) => {
                  const numVal = Number.parseFloat(val)
                  variables[`${key}.${prop}`] = isNaN(numVal) ? val : numVal
                })
              } else {
                // Simple value
                const numValue = Number.parseFloat(fieldValue)
                variables[key] = isNaN(numValue) ? fieldValue : numValue
              }
            } else {
              variables[key] = value
            }
          })
        }
        
        // Add processes array length for formula access
        if (processes && processes.length > 0) {
          variables["procedes.length"] = processes.length
          variables["procedes"] = processes
        }

        // Evaluate ALL formulas from the profile
        const formulaResults: FormulaResult[] = []

        if (clientProfile.formulas && clientProfile.formulas.length > 0) {
          for (const formula of clientProfile.formulas) {
            try {
              // Check condition if exists
              if (formula.condition) {
                const conditionMet = evaluateCondition(formula.condition, variables)
                if (!conditionMet) continue
              }

              // Evaluate formula with improved variable substitution
              let formulaToEvaluate = formula.formula
              
              // Replace variables in formula (handle both simple and nested access like trous.quantite)
              // Sort by length descending to replace longer keys first (e.g., trous.quantite before trous)
              const sortedKeys = Object.keys(variables).sort((a, b) => b.length - a.length)
              
              sortedKeys.forEach((key) => {
                const value = variables[key]
                if (typeof value === "number") {
                  // Escape special regex characters in key
                  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                  formulaToEvaluate = formulaToEvaluate.replace(new RegExp(`\\b${escapedKey}\\b`, "g"), value.toString())
                } else if (typeof value === "string" && !isNaN(Number.parseFloat(value))) {
                  // Try to convert string numbers
                  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                  formulaToEvaluate = formulaToEvaluate.replace(new RegExp(`\\b${escapedKey}\\b`, "g"), value)
                }
              })

              const result = evaluate(formulaToEvaluate)

              formulaResults.push({
                formulaId: formula.id,
                formulaName: formula.name,
                category: formula.category,
                value: typeof result === "number" ? result : 0,
                result: typeof result === "number" ? result : 0, // Keep for backward compatibility
                unit: formula.unit,
                variables: formula.variables.reduce((acc, varName) => {
                  acc[varName] = variables[varName] ?? variables[varName.split(".")[0]]
                  return acc
                }, {} as Record<string, any>),
                details: formula.description,
                formula: formula.formula,
              })
            } catch (error) {
              console.error(`Erreur calcul formule ${formula.name}:`, error)
            }
          }
        }

        // Default optimization calculation (pieces per bar)
        const marge = 12
        const jeu = 0.25
        const piecesPerBar = Math.max(0, Math.floor((bestMaterial.standardLength - marge) / (longueurPiece + jeu)))
        const costPerPiece = piecesPerBar > 0 ? bestMaterial.costPerUnit / piecesPerBar : bestMaterial.costPerUnit

        const calculationResult: ExtendedCalculationResult = {
          piecesPerBar,
          estimatedCost: costPerPiece,
          selectedMaterial: bestMaterial,
          optimizationDetails: `Optimisation: ${piecesPerBar} pièces par barre de ${bestMaterial.standardLength}${bestMaterial.unit}`,
          formulaResults,
          calculatedAt: new Date(),
          profileUsed: clientProfile.name,
          materialId: bestMaterial.id,
        }

        allResults.push(calculationResult)
        setSelectedResult(calculationResult)
        onCalculationComplete(calculationResult)
      }

      setAllCalculationResults(allResults)
    } catch (error) {
      console.error("Erreur calculs:", error)
      alert(`Erreur lors des calculs: ${error.message}`)
    } finally {
      setIsCalculating(false)
    }
  }

  const evaluateCondition = (condition: string, variables: any): boolean => {
    try {
      let conditionToEvaluate = condition
      Object.entries(variables).forEach(([key, value]) => {
        if (typeof value === "string") {
          conditionToEvaluate = conditionToEvaluate.replace(new RegExp(`${key}`, "g"), `'${value}'`)
        } else if (typeof value === "number") {
          conditionToEvaluate = conditionToEvaluate.replace(new RegExp(key, "g"), value.toString())
        } else if (Array.isArray(value)) {
          const processCheck = condition.match(/procede\s*==\s*'([^']+)'/)?.[1]
          if (processCheck) {
            return value.some((v) => v.toLowerCase().includes(processCheck.toLowerCase()))
          }
        }
      })

      conditionToEvaluate = conditionToEvaluate.replace(/==/g, "==")
      return evaluate(conditionToEvaluate)
    } catch (error) {
      return false
    }
  }

  const selectResult = (result: ExtendedCalculationResult) => {
    setSelectedResult(result)
    onCalculationComplete(result)
  }

  // Fonction pour tronquer le texte
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  // Fonction pour formater les nombres avec gestion de la taille
  const formatNumber = (num: number, decimals = 2) => {
    const formatted = num.toFixed(decimals)
    // Si le nombre est trop long, on réduit les décimales
    if (formatted.length > 8) {
      return num.toFixed(1)
    }
    if (formatted.length > 6) {
      return num.toFixed(2)
    }
    return formatted
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={performAllCalculations}
        disabled={isCalculating || isLoadingMaterials || compatibleMaterials.length === 0}
        className="w-full bg-[#0078FF] hover:bg-[#0078FF]/90"
      >
        {isCalculating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Calcul en cours...
          </>
        ) : isLoadingMaterials ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Chargement matériaux...
          </>
        ) : (
          <>
            <Calculator className="h-4 w-4 mr-2" />
            Lancer les calculs ({compatibleMaterials.length} matériaux)
          </>
        )}
      </Button>

      {selectedResult && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-[#0078FF]">Résultats des calculs</h3>

          <Card className="border-[#0078FF]/20">
            <CardHeader className="bg-[#0078FF]/5">
              <CardTitle className="text-[#0078FF] text-base">Optimisation matériau</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 bg-[#0078FF]/10 rounded-lg">
                  <div className="text-2xl font-bold text-[#0078FF]">{selectedResult.piecesPerBar}</div>
                  <div className="text-xs text-gray-600 mt-1">Pièces/Barre</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">${formatNumber(selectedResult.estimatedCost)}</div>
                  <div className="text-xs text-gray-600 mt-1">Coût/Pièce</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    ${formatNumber(selectedResult.estimatedCost * selectedResult.piecesPerBar)}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Coût/Barre</div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Matériau:</span>
                  <span className="font-medium">{selectedResult.selectedMaterial.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium">{selectedResult.selectedMaterial.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dimensions:</span>
                  <span className="font-medium">{selectedResult.selectedMaterial.dimensions}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Display formula results grouped by category - Time operations highlighted */}
          {selectedResult.formulaResults && selectedResult.formulaResults.length > 0 && (
            <>
              {/* Show time formulas first and prominently */}
              {["time", "cost", "quantity", "optimization", "other"].map((category) => {
                const categoryResults = selectedResult.formulaResults.filter((r) => r.category === category)
                if (categoryResults.length === 0) return null

                const categoryColors: Record<string, { bg: string; text: string; border: string; icon: string }> = {
                  time: { 
                    bg: "bg-blue-50", 
                    text: "text-blue-700", 
                    border: "border-blue-300",
                    icon: "⏱️ Temps d'opération"
                  },
                  cost: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", icon: "💰 Coûts" },
                  quantity: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", icon: "📦 Quantités" },
                  optimization: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", icon: "⚡ Optimisations" },
                  other: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", icon: "📊 Autres" },
                }

                const colors = categoryColors[category]

                return (
                  <Card key={category} className={`border-l-4 ${colors.border} ${category === "time" ? "shadow-md" : ""}`}>
                    <CardHeader className={colors.bg}>
                      <CardTitle className={`${colors.text} text-base flex items-center gap-2`}>
                        {colors.icon}
                        <Badge variant="outline" className={category === "time" ? "bg-blue-100" : ""}>
                          {categoryResults.length}
                        </Badge>
                        {category === "time" && (
                          <span className="text-xs font-normal ml-auto">
                            Temps estimés pour les opérations de fabrication
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        {categoryResults.map((formulaResult) => (
                          <div 
                            key={formulaResult.formulaId} 
                            className={`bg-white border rounded-lg p-3 ${category === "time" ? "border-blue-200" : ""}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <span className="font-medium text-sm">{formulaResult.formulaName}</span>
                                {formulaResult.details && (
                                  <p className="text-xs text-gray-500 mt-1">{formulaResult.details}</p>
                                )}
                              </div>
                              <span className={`text-lg font-bold ${colors.text} ml-4`}>
                                {formatNumber(formulaResult.result || (formulaResult.value as number))}
                                {formulaResult.unit && ` ${formulaResult.unit}`}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded mt-2">
                              <span className="text-gray-400">Formule:</span> {formulaResult.formula}
                            </div>
                            {formulaResult.variables && Object.keys(formulaResult.variables).length > 0 && (
                              <div className="text-xs text-gray-400 mt-1">
                                Variables utilisées: {Object.keys(formulaResult.variables).join(", ")}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
