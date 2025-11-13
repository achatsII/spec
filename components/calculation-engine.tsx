"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Calculator } from "lucide-react"
import { evaluate } from "mathjs"
import type { AnalysisResult, ExtractionProfile, CalculationResult, RawMaterial, FormulaResult, CustomFormula } from "@/types/analysis"

interface ExtendedCalculationResult extends CalculationResult {
  materialId: string
}

interface CalculationEngineProps {
  analysisResult: AnalysisResult
  clientProfile: ExtractionProfile
  onCalculationComplete: (result: CalculationResult) => void
  onResultUpdate?: (result: AnalysisResult) => void // Pour mettre à jour les données extraites
  isCalculating: boolean
  setIsCalculating: (calculating: boolean) => void
}

export default function CalculationEngine({
  analysisResult,
  clientProfile,
  onCalculationComplete,
  onResultUpdate,
  isCalculating,
  setIsCalculating,
}: CalculationEngineProps) {
  const [compatibleMaterials, setCompatibleMaterials] = useState<RawMaterial[]>([])
  const [allCalculationResults, setAllCalculationResults] = useState<ExtendedCalculationResult[]>([])
  const [selectedResult, setSelectedResult] = useState<ExtendedCalculationResult | null>(null)
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false)
  const [formulaResults, setFormulaResults] = useState<Record<string, FormulaResult>>({}) // Résultats par formule ID
  const [calculatingFormulaId, setCalculatingFormulaId] = useState<string | null>(null)

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

  // Fonction pour vérifier la cohérence des unités
  const checkUnitConsistency = (variables: Record<string, any>, usedVariables: string[]): { isConsistent: boolean; warning: string } => {
    const units: Record<string, string> = {}

    // Extraire les unités des variables utilisées
    usedVariables.forEach(varName => {
      const value = variables[varName]
      if (value && typeof value === "object" && "unit" in value) {
        units[varName] = value.unit
      }
    })

    // Si on a plusieurs unités, vérifier qu'elles sont cohérentes
    const uniqueUnits = [...new Set(Object.values(units))]

    if (uniqueUnits.length > 1) {
      const unitsDetails = Object.entries(units)
        .map(([varName, unit]) => `${varName}: ${unit}`)
        .join(", ")
      return {
        isConsistent: false,
        warning: `⚠️ ATTENTION: Unités incohérentes détectées (${unitsDetails}). Vérifiez les données extraites dans l'étape de validation.`
      }
    }

    return { isConsistent: true, warning: "" }
  }

  // Fonctions d'agrégation pour les listes d'objets
  const processAggregationFunctions = (formula: string, variables: Record<string, any>): string => {
    let processedFormula = formula

    // Regex pour détecter sum(field.property), avg(field.property), etc.
    const aggregationPattern = /(sum|avg|max|min|count)\(([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)\)/g

    processedFormula = processedFormula.replace(aggregationPattern, (match, func, path) => {
      const parts = path.split('.')
      const fieldName = parts[0]
      const propertyName = parts[1]

      // Récupérer la variable
      const fieldData = variables[fieldName]

      if (!fieldData) {
        console.warn(`Champ "${fieldName}" non trouvé pour ${func}(${path})`)
        return '0'
      }

      // Si c'est un tableau d'objets
      if (Array.isArray(fieldData) && fieldData.length > 0) {
        if (!propertyName) {
          // count(field) - compte les éléments
          if (func === 'count') {
            return fieldData.length.toString()
          }
          console.warn(`Propriété manquante pour ${func}(${path}) sur un tableau`)
          return '0'
        }

        // Extraire les valeurs de la propriété
        const values = fieldData
          .map(item => {
            if (typeof item === 'object' && item !== null && propertyName in item) {
              const val = item[propertyName]
              return typeof val === 'number' ? val : parseFloat(val)
            }
            return null
          })
          .filter(v => v !== null && !isNaN(v)) as number[]

        if (values.length === 0) {
          console.warn(`Aucune valeur numérique trouvée pour ${func}(${path})`)
          return '0'
        }

        // Appliquer la fonction d'agrégation
        switch (func) {
          case 'sum':
            return values.reduce((sum, v) => sum + v, 0).toString()
          case 'avg':
            return (values.reduce((sum, v) => sum + v, 0) / values.length).toString()
          case 'max':
            return Math.max(...values).toString()
          case 'min':
            return Math.min(...values).toString()
          case 'count':
            return values.length.toString()
          default:
            return '0'
        }
      }
      // Si c'est un objet simple avec des propriétés agrégées (déjà calculées)
      else if (typeof fieldData === 'object' && fieldData !== null && propertyName && propertyName in fieldData) {
        return fieldData[propertyName].toString()
      }
      // Si c'est une valeur simple
      else if (typeof fieldData === 'number') {
        return fieldData.toString()
      }

      console.warn(`Type de données non supporté pour ${func}(${path})`)
      return '0'
    })

    return processedFormula
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

              // Vérifier la cohérence des unités pour les formules géométriques
              let unitWarning = ""
              if (formula.category === "geometry" && formula.variables && formula.variables.length > 0) {
                const unitCheck = checkUnitConsistency(variables, formula.variables)
                if (!unitCheck.isConsistent) {
                  unitWarning = unitCheck.warning
                  console.warn(`[${formula.name}] ${unitWarning}`)
                }
              }

              // Evaluate formula with improved variable substitution
              // D'abord, traiter les fonctions d'agrégation (sum, avg, max, min, count)
              let formulaToEvaluate = processAggregationFunctions(formula.formula, variables)

              // Replace variables in formula (handle both simple and nested access like trous.quantite)
              // Sort by length descending to replace longer keys first (e.g., trous.quantite before trous)
              const sortedKeys = Object.keys(variables).sort((a, b) => b.length - a.length)

              sortedKeys.forEach((key) => {
                const value = variables[key]
                // Pour les objets avec value et unit, utiliser seulement la valeur numérique
                if (typeof value === "object" && value !== null && "value" in value && "unit" in value) {
                  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                  formulaToEvaluate = formulaToEvaluate.replace(new RegExp(`\\b${escapedKey}\\b`, "g"), value.value.toString())
                } else if (typeof value === "number") {
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

              // Ajouter le warning d'unités à la description si nécessaire
              const detailsWithWarning = unitWarning
                ? `${formula.description || ""}${formula.description ? "\n\n" : ""}${unitWarning}`
                : formula.description

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
                details: detailsWithWarning,
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

  // Fonction pour construire les variables depuis les données extraites
  // IMPORTANT: Utilise exactement les noms de variables configurés par l'utilisateur
  // et accède aux valeurs dans la structure ExtractedField { valeur, confiance, raison }
  const buildVariables = () => {
    const extractedData = analysisResult.extractedData
    const bestMaterial = compatibleMaterials[0] || null

    const variables: Record<string, any> = {
      longueur_barre: bestMaterial?.standardLength || 0,
      cout_materiau: bestMaterial?.costPerUnit || 0,
    }

    // Fonction helper pour extraire une valeur numérique d'un ExtractedField
    // Gère les strings avec unités comme "0.329 in", "0.472 +0.002/-0.001 in"
    const getNumericValue = (field: any): number => {
      if (!field || typeof field !== "object") return 0
      if ("valeur" in field) {
        const val = field.valeur
        if (typeof val === "number") return val
        if (typeof val === "string") {
          // Extraire le premier nombre de la string (gère les tolérances comme "0.472 +0.002/-0.001 in")
          const match = val.match(/[\d.]+/)
          if (match) {
            return Number.parseFloat(match[0]) || 0
          }
          // Si pas de match, essayer de parser directement
          return Number.parseFloat(val.toString().replace(/[^\d.-]/g, "")) || 0
        }
      }
      return 0
    }

    // Ajouter les dimensions avec accès direct aux propriétés
    // Ex: dimensions.longueur, dimensions.largeur, dimensions.hauteur
    if (extractedData.dimensions) {
      Object.entries(extractedData.dimensions).forEach(([dimName, dimField]) => {
        if (dimField && typeof dimField === "object" && "valeur" in dimField) {
          const numValue = getNumericValue(dimField)
          // Accès direct: dimensions.longueur, dimensions.largeur, etc.
          variables[`dimensions.${dimName}`] = numValue
          // Accès simplifié: longueur, largeur, hauteur (pour compatibilité)
          if (dimName === "longueur" || dimName === "largeur" || dimName === "hauteur") {
            variables[dimName] = numValue
          }
        }
      })
    }

    // Ajouter les champs personnalisés (customFields) avec accès exact aux propriétés
    // IMPORTANT: Le "name" du JSON devient la clé dans customFields
    // Le "value" du JSON devient fieldData.valeur
    if (extractedData.customFields) {
      Object.entries(extractedData.customFields).forEach(([fieldName, fieldData]) => {
        // fieldName correspond au "name" dans le JSON de l'IA
        // fieldData est un ExtractedField { valeur, confiance, raison }
        // fieldData.valeur correspond au "value" dans le JSON de l'IA
        
        if (!fieldData || typeof fieldData !== "object" || !("valeur" in fieldData)) {
          return
        }

        const fieldValue = fieldData.valeur

        // Si c'est un tableau d'objets (liste_objets) - ex: "trous"
        if (Array.isArray(fieldValue) && fieldValue.length > 0) {
          const firstItem = fieldValue[0]
          
          if (typeof firstItem === "object" && firstItem !== null) {
            // Extraire toutes les propriétés disponibles dans les objets du tableau
            const allProperties = new Set<string>()
            fieldValue.forEach((item) => {
              if (typeof item === "object" && item !== null) {
                Object.keys(item).forEach(prop => allProperties.add(prop))
              }
            })
            
            // Agréger les valeurs pour chaque propriété
            const aggregated: Record<string, any> = {}
            allProperties.forEach((prop) => {
              const values = fieldValue
                .map((item) => {
                  if (typeof item === "object" && item !== null && prop in item) {
                    const val = item[prop]
                    // Si c'est déjà un nombre, le garder
                    if (typeof val === "number") return val
                    // Si c'est une string, essayer de parser le nombre
                    const numVal = Number.parseFloat(val)
                    return isNaN(numVal) ? val : numVal
                  }
                  return null
                })
                .filter((v) => v !== null)
              
              if (values.length > 0) {
                // Agrégation intelligente selon le type de propriété
                if (prop === "quantity" || prop === "quantite" || prop === "nombre" || prop === "count" || prop === "qty") {
                  // Pour les quantités, faire une somme
                  aggregated[prop] = values.reduce((sum, v) => sum + (typeof v === "number" ? v : 0), 0)
                } else if (typeof values[0] === "number") {
                  // Pour les nombres (diamètres, etc.), faire une moyenne
                  const numValues = values.filter(v => typeof v === "number")
                  aggregated[prop] = numValues.length > 0 
                    ? numValues.reduce((sum, v) => sum + v, 0) / numValues.length 
                    : values[0]
                } else {
                  // Pour les strings (type, position, etc.), prendre la première valeur
                  aggregated[prop] = values[0]
                }
              }
            })
            
            aggregated.length = fieldValue.length

            // IMPORTANT: Stocker le TABLEAU ORIGINAL pour les fonctions d'agrégation (sum, avg, etc.)
            // Les fonctions comme sum(trous.quantite) ont besoin du tableau complet
            variables[fieldName] = fieldValue

            // AUSSI stocker l'objet agrégé pour la rétrocompatibilité
            // Accès aux propriétés agrégées: trous.quantity, trous.diameter, etc.
            Object.entries(aggregated).forEach(([prop, val]) => {
              variables[`${fieldName}.${prop}`] = val
            })
          } else {
            // Tableau de valeurs simples
            variables[fieldName] = fieldValue
            variables[`${fieldName}.length`] = fieldValue.length
          }
        } 
        // Si c'est un objet simple (objet)
        else if (typeof fieldValue === "object" && fieldValue !== null && !Array.isArray(fieldValue)) {
          // Si c'est un objet avec value et unit (dimension), le garder tel quel
          if ("value" in fieldValue && "unit" in fieldValue) {
            // Objet dimension: { value: 100, unit: "mm" }
            variables[fieldName] = fieldValue
            // Permettre aussi l'accès à fieldName.value et fieldName.unit
            variables[`${fieldName}.value`] = fieldValue.value
            variables[`${fieldName}.unit`] = fieldValue.unit
          } else {
            // Accès au champ complet
            variables[fieldName] = fieldValue

            // Accès aux propriétés: champ.propriete
            Object.entries(fieldValue).forEach(([prop, val]) => {
              if (typeof val === "number") {
                variables[`${fieldName}.${prop}`] = val
              } else {
                const numVal = Number.parseFloat(String(val))
                variables[`${fieldName}.${prop}`] = isNaN(numVal) ? val : numVal
              }
            })
          }
        } 
        // Si c'est une valeur simple (string ou number) - ex: "longueur", "largeur", "hauteur", "quantity"
        else {
          // Si c'est un number, l'utiliser directement
          if (typeof fieldValue === "number") {
            variables[fieldName] = fieldValue
          } 
          // Si c'est une string, essayer d'extraire le nombre (gère les unités)
          else if (typeof fieldValue === "string") {
            // Si la string contient "Non specifie" ou similaire, mettre 0
            if (fieldValue.toLowerCase().includes("non specifie") || fieldValue.toLowerCase().includes("non spécifié")) {
              variables[fieldName] = 0
            } else {
              // Extraire le nombre de la string (gère "0.329 in", "0.472 +0.002/-0.001 in")
              const numValue = getNumericValue(fieldData)
              variables[fieldName] = numValue
            }
          } 
          else {
            variables[fieldName] = fieldValue
          }
        }
      })
    }

    // Ajouter les procédés
    const processes = (extractedData.processes || []).map((p) => p?.valeur || "")
    if (processes && processes.length > 0) {
      variables["procedes.length"] = processes.length
      variables["procedes"] = processes
    }

    return variables
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

  // Fonction pour calculer une formule individuelle
  const calculateSingleFormula = async (formula: CustomFormula) => {
    if (compatibleMaterials.length === 0) {
      alert("Aucun matériau disponible pour le calcul")
      return
    }

    setCalculatingFormulaId(formula.id)

    try {
      const variables = buildVariables()

      // Check condition if exists
      if (formula.condition) {
        const conditionMet = evaluateCondition(formula.condition, variables)
        if (!conditionMet) {
          alert(`La condition de la formule "${formula.name}" n'est pas remplie`)
          setCalculatingFormulaId(null)
          return
        }
      }

      // Vérifier la cohérence des unités pour les formules géométriques
      let unitWarning = ""
      if (formula.category === "geometry" && formula.variables && formula.variables.length > 0) {
        const unitCheck = checkUnitConsistency(variables, formula.variables)
        if (!unitCheck.isConsistent) {
          unitWarning = unitCheck.warning
          console.warn(`[${formula.name}] ${unitWarning}`)
        }
      }

      // Evaluate formula
      // D'abord, traiter les fonctions d'agrégation (sum, avg, max, min, count)
      let formulaToEvaluate = processAggregationFunctions(formula.formula, variables)
      const sortedKeys = Object.keys(variables).sort((a, b) => b.length - a.length)

      sortedKeys.forEach((key) => {
        const value = variables[key]
        // Pour les objets avec value et unit, utiliser seulement la valeur numérique
        if (typeof value === "object" && value !== null && "value" in value && "unit" in value) {
          const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          formulaToEvaluate = formulaToEvaluate.replace(new RegExp(`\\b${escapedKey}\\b`, "g"), value.value.toString())
        } else if (typeof value === "number") {
          const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          formulaToEvaluate = formulaToEvaluate.replace(new RegExp(`\\b${escapedKey}\\b`, "g"), value.toString())
        } else if (typeof value === "string" && !isNaN(Number.parseFloat(value))) {
          const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          formulaToEvaluate = formulaToEvaluate.replace(new RegExp(`\\b${escapedKey}\\b`, "g"), value)
        }
      })

      const result = evaluate(formulaToEvaluate)

      // Ajouter le warning d'unités à la description si nécessaire
      const detailsWithWarning = unitWarning
        ? `${formula.description || ""}${formula.description ? "\n\n" : ""}${unitWarning}`
        : formula.description

      const formulaResult: FormulaResult = {
        formulaId: formula.id,
        formulaName: formula.name,
        category: formula.category,
        value: typeof result === "number" ? result : 0,
        result: typeof result === "number" ? result : 0,
        unit: formula.unit,
        variables: formula.variables.reduce((acc, varName) => {
          acc[varName] = variables[varName] ?? variables[varName.split(".")[0]]
          return acc
        }, {} as Record<string, any>),
        details: detailsWithWarning,
        formula: formula.formula,
      }

      setFormulaResults(prev => ({
        ...prev,
        [formula.id]: formulaResult
      }))
    } catch (error) {
      console.error(`Erreur calcul formule ${formula.name}:`, error)
      alert(`Erreur lors du calcul de la formule "${formula.name}": ${error instanceof Error ? error.message : "Erreur inconnue"}`)
    } finally {
      setCalculatingFormulaId(null)
    }
  }

  // Fonction pour ajouter un résultat de formule aux données extraites
  // IMPORTANT: Utiliser le même format que les données extraites de l'IA (ExtractedField)
  const addFormulaResultToExtractedData = (formulaResult: FormulaResult) => {
    if (!onResultUpdate) {
      alert("Impossible de mettre à jour les données extraites")
      return
    }

    const resultValue = formulaResult.result || (formulaResult.value as number)
    
    // Utiliser le nom de la formule comme clé dans customFields
    const fieldName = formulaResult.formulaName

    // Format identique aux données extraites de l'IA : { valeur, confiance, raison }
    // Ce format est compatible avec ExtractedField et sera correctement exporté en CSV
    const extractedField = {
      valeur: resultValue, // Peut être string, number, ou any selon le type
      confiance: 100, // Confiance maximale pour un calcul
      raison: `Calculé par la formule: ${formulaResult.formula}${formulaResult.unit ? ` (unité: ${formulaResult.unit})` : ''}`,
    }

    const updatedResult: AnalysisResult = {
      ...analysisResult,
      extractedData: {
        ...analysisResult.extractedData,
        customFields: {
          ...(analysisResult.extractedData.customFields || {}),
          [fieldName]: extractedField,
        },
      },
    }

    onResultUpdate(updatedResult)
    alert(`Le résultat "${formulaResult.formulaName}" (${formatNumber(resultValue)}${formulaResult.unit ? ` ${formulaResult.unit}` : ''}) a été ajouté aux données extraites et sera inclus dans l'export CSV.`)
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
      {/* Affichage des formules individuelles */}
      {clientProfile.formulas && clientProfile.formulas.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-[#0078FF]">Formules de calcul disponibles</h3>
          {clientProfile.formulas.map((formula) => {
            const result = formulaResults[formula.id]
            const isCalculating = calculatingFormulaId === formula.id
            const isAlreadyInExtracted = analysisResult.extractedData.customFields?.[formula.name]
            
            return (
              <Card key={formula.id} className="border-[#0078FF]/20">
                <CardHeader className="bg-[#0078FF]/5 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-[#0078FF] text-base flex items-center gap-2">
                        {formula.name}
                        <Badge variant="outline" className="text-xs">
                          {formula.category}
                        </Badge>
                        {isAlreadyInExtracted && (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            ✓ Ajouté aux données
                          </Badge>
                        )}
                      </CardTitle>
                      {formula.description && (
                        <p className="text-xs text-gray-600 mt-1">{formula.description}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs font-mono bg-gray-50 p-2 rounded">
                    <span className="text-gray-400">Formule:</span> {formula.formula}
                  </div>
                  
                  {formula.variables && formula.variables.length > 0 && (
                    <div className="text-xs text-gray-500">
                      Variables: {formula.variables.join(", ")}
                    </div>
                  )}

                  {result ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-green-800">Résultat calculé:</div>
                          <div className="text-2xl font-bold text-green-700 mt-1">
                            {formatNumber(result.result || (result.value as number))}
                            {result.unit && <span className="text-lg ml-1">{result.unit}</span>}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={() => addFormulaResultToExtractedData(result)}
                          disabled={isAlreadyInExtracted !== undefined}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          {isAlreadyInExtracted ? "✓ Déjà ajouté" : "➕ Ajouter aux données extraites"}
                        </Button>
                        <Button
                          onClick={() => calculateSingleFormula(formula)}
                          disabled={isCalculating || isLoadingMaterials || compatibleMaterials.length === 0}
                          variant="outline"
                          size="sm"
                        >
                          {isCalculating ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Calcul...
                            </>
                          ) : (
                            "🔄 Recalculer"
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => calculateSingleFormula(formula)}
                      disabled={isCalculating || isLoadingMaterials || compatibleMaterials.length === 0}
                      className="w-full bg-[#0078FF] hover:bg-[#0078FF]/90"
                      size="sm"
                    >
                      {isCalculating ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          Calcul en cours...
                        </>
                      ) : isLoadingMaterials ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          Chargement...
                        </>
                      ) : (
                        <>
                          <Calculator className="h-3 w-3 mr-2" />
                          Lancer le calcul
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Bouton pour calculer toutes les formules d'un coup (optionnel) */}
      {clientProfile.formulas && clientProfile.formulas.length > 0 && (
        <div className="pt-4 border-t">
          <Button
            onClick={performAllCalculations}
            disabled={isCalculating || isLoadingMaterials || compatibleMaterials.length === 0}
            className="w-full bg-gray-600 hover:bg-gray-700"
            variant="outline"
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
                Calculer toutes les formules + optimisation ({compatibleMaterials.length} matériaux)
              </>
            )}
          </Button>
        </div>
      )}

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
              {["time", "geometry", "cost", "quantity", "optimization", "other"].map((category) => {
                const categoryResults = selectedResult.formulaResults.filter((r) => r.category === category)
                if (categoryResults.length === 0) return null

                const categoryColors: Record<string, { bg: string; text: string; border: string; icon: string }> = {
                  time: {
                    bg: "bg-blue-50",
                    text: "text-blue-700",
                    border: "border-blue-300",
                    icon: "⏱️ Temps d'opération"
                  },
                  geometry: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", icon: "📐 Géométrie" },
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
