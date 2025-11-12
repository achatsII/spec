"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Calculator } from "lucide-react"
import { evaluate } from "mathjs"
import type { AnalysisResult, ClientProfile, CalculationResult, Material } from "@/types/analysis"

interface ExtendedCalculationResult extends CalculationResult {
  materialId: string
  formulaId?: string
}

interface CalculationEngineProps {
  analysisResult: AnalysisResult
  clientProfile: ClientProfile
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
  const [compatibleMaterials, setCompatibleMaterials] = useState<Material[]>([])
  const [allCalculationResults, setAllCalculationResults] = useState<ExtendedCalculationResult[]>([])
  const [selectedResult, setSelectedResult] = useState<ExtendedCalculationResult | null>(null)

  useEffect(() => {
    const pieceType = analysisResult.extractedData.pieceType.valeur.toLowerCase()
    const material = analysisResult.extractedData.material.valeur.toLowerCase()

    const compatible = clientProfile.materials.filter((m) => {
      const materialType = m.type.toLowerCase()
      return (
        materialType.includes(pieceType) ||
        materialType.includes(material) ||
        (pieceType === "tube" && materialType.includes("tube")) ||
        (pieceType === "plat" && materialType.includes("plat")) ||
        materialType.includes("acier") ||
        materialType.includes("alu")
      )
    })

    if (compatible.length === 0) {
      setCompatibleMaterials(clientProfile.materials)
    } else {
      setCompatibleMaterials(compatible)
    }
  }, [analysisResult, clientProfile])

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

      const processes = (analysisResult.extractedData.processes || []).map((p) => p?.valeur || "")

      if (longueurPiece <= 0) {
        alert("Attention: La longueur de la pièce n'est pas définie ou invalide.")
        setIsCalculating(false)
        return
      }

      const allResults: ExtendedCalculationResult[] = []

      for (const material of compatibleMaterials) {
        const variables = {
          longueur_piece: longueurPiece,
          longueur_barre: material.standardLength,
          type_piece: analysisResult.extractedData.pieceType?.valeur || "autre",
          materiau: analysisResult.extractedData.material?.valeur || "non spécifié",
          procedes: processes,
          cout_materiau: material.costPerUnit,
        }

        // Tester les formules applicables
        const applicableFormulas = []
        for (const formula of clientProfile.formulas) {
          try {
            const conditionResult = evaluateCondition(formula.condition, variables)
            if (conditionResult) {
              applicableFormulas.push(formula)
            }
          } catch (error) {
            console.warn("Erreur condition:", error)
          }
        }

        // Calculs avec formules
        if (applicableFormulas.length > 0) {
          for (const formula of applicableFormulas) {
            try {
              let formulaToEvaluate = formula.formula
              Object.entries(variables).forEach(([key, value]) => {
                if (typeof value === "number") {
                  formulaToEvaluate = formulaToEvaluate.replace(new RegExp(key, "g"), value.toString())
                }
              })

              const piecesPerBar = Math.max(0, Math.floor(evaluate(formulaToEvaluate)))
              const costPerPiece = piecesPerBar > 0 ? material.costPerUnit / piecesPerBar : material.costPerUnit

              allResults.push({
                piecesPerBar,
                estimatedCost: costPerPiece,
                selectedMaterial: material,
                appliedFormula: formula,
                details: `${formula.name}: ${piecesPerBar} pièces par barre`,
                variables,
                materialId: material.id,
                formulaId: formula.id,
              })
            } catch (error) {
              console.error("Erreur calcul formule:", error)
            }
          }
        }

        // Calcul par défaut
        const marge = 12
        const jeu = 0.25
        const defaultPiecesPerBar = Math.max(0, Math.floor((material.standardLength - marge) / (longueurPiece + jeu)))
        const defaultCostPerPiece =
          defaultPiecesPerBar > 0 ? material.costPerUnit / defaultPiecesPerBar : material.costPerUnit

        allResults.push({
          piecesPerBar: defaultPiecesPerBar,
          estimatedCost: defaultCostPerPiece,
          selectedMaterial: material,
          appliedFormula: null,
          details: `Calcul standard: ${defaultPiecesPerBar} pièces par barre`,
          variables,
          materialId: material.id,
        })
      }

      // Trier par efficacité
      allResults.sort((a, b) => {
        if (b.piecesPerBar !== a.piecesPerBar) {
          return b.piecesPerBar - a.piecesPerBar
        }
        return a.estimatedCost - b.estimatedCost
      })

      if (allResults.length > 0) {
        setSelectedResult(allResults[0])
        onCalculationComplete(allResults[0])
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
        disabled={isCalculating || compatibleMaterials.length === 0}
        className="w-full bg-[#0078FF] hover:bg-[#0078FF]/90"
      >
        {isCalculating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Calcul en cours...
          </>
        ) : (
          <>
            <Calculator className="h-4 w-4 mr-2" />
            Lancer les calculs ({compatibleMaterials.length} matériaux)
          </>
        )}
      </Button>

      {allCalculationResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-[#0078FF]">Résultats ({allCalculationResults.length} calculs)</h3>

          <div className="grid grid-cols-1 gap-3">
            {allCalculationResults.map((result, index) => (
              <Card
                key={`${result.materialId}-${result.formulaId || "default"}`}
                className={`cursor-pointer transition-all duration-200 border-l-4 ${
                  selectedResult === result
                    ? "border-l-[#0078FF] bg-[#0078FF]/5 shadow-md"
                    : "border-l-gray-200 hover:border-l-[#0078FF]/50 hover:shadow-sm"
                }`}
                onClick={() => selectResult(result)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="font-medium text-sm truncate" title={result.selectedMaterial.type}>
                        {result.selectedMaterial.type}
                      </h4>
                      <p
                        className="text-xs text-gray-500 truncate"
                        title={`${result.selectedMaterial.dimensions} • ${result.selectedMaterial.standardLength}${result.selectedMaterial.unit}`}
                      >
                        {result.selectedMaterial.dimensions} • {result.selectedMaterial.standardLength}
                        {result.selectedMaterial.unit}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold text-[#0078FF]">{result.piecesPerBar}</div>
                      <div className="text-xs text-gray-500">pièces</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <span className="font-medium">${formatNumber(result.estimatedCost)}</span>
                      <span className="text-gray-500"> /pièce</span>
                    </div>
                    <div
                      className="text-xs text-gray-500 truncate max-w-[100px]"
                      title={result.appliedFormula ? result.appliedFormula.name : "Standard"}
                    >
                      {result.appliedFormula ? result.appliedFormula.name : "Standard"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedResult && (
            <Card className="border-[#0078FF]/20">
              <CardHeader className="bg-[#0078FF]/5">
                <CardTitle className="text-[#0078FF] text-base">Détail du calcul sélectionné</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {/* Métriques principales - layout compact */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-3 bg-[#0078FF]/10 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-[#0078FF] leading-tight">
                      {selectedResult.piecesPerBar}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Pièces/Barre</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-green-600 leading-tight">
                      ${formatNumber(selectedResult.estimatedCost)}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Coût/Pièce</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-purple-600 leading-tight">
                      ${formatNumber(selectedResult.estimatedCost * selectedResult.piecesPerBar)}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Coût/Barre</div>
                  </div>
                </div>

                {/* Détails - layout optimisé */}
                <div className="space-y-2">
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-600 text-xs font-medium flex-shrink-0">Matériau:</span>
                      <span
                        className="font-medium text-xs text-right break-words max-w-[70%]"
                        title={selectedResult.selectedMaterial.type}
                      >
                        {truncateText(selectedResult.selectedMaterial.type, 25)}
                      </span>
                    </div>

                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-600 text-xs font-medium flex-shrink-0">Méthode:</span>
                      <span
                        className="font-medium text-xs text-right break-words max-w-[70%]"
                        title={selectedResult.appliedFormula?.name || "Calcul standard"}
                      >
                        {truncateText(selectedResult.appliedFormula?.name || "Calcul standard", 20)}
                      </span>
                    </div>

                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-600 text-xs font-medium flex-shrink-0">Détails:</span>
                      <span
                        className="font-medium text-xs text-right break-words max-w-[70%]"
                        title={selectedResult.details}
                      >
                        {truncateText(selectedResult.details, 30)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Informations supplémentaires si disponibles */}
                {selectedResult.appliedFormula && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <h4 className="text-xs font-medium text-blue-800 mb-2">Formule appliquée</h4>
                    <div className="text-xs text-blue-700 space-y-1">
                      <p className="break-words">
                        <span className="font-medium">Nom:</span> {truncateText(selectedResult.appliedFormula.name, 40)}
                      </p>
                      {selectedResult.appliedFormula.description && (
                        <p className="break-words">
                          <span className="font-medium">Description:</span>{" "}
                          {truncateText(selectedResult.appliedFormula.description, 60)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
