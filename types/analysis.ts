export interface ExtractedField {
  valeur: string
  confiance: number
  raison: string
}

export interface DimensionField extends ExtractedField {
  unite: string
}

export interface ExtractedData {
  reference: ExtractedField
  description: ExtractedField
  material: ExtractedField
  pieceType: ExtractedField
  dimensions: {
    longueur?: DimensionField
    largeur?: DimensionField
    hauteur?: DimensionField
    épaisseur?: DimensionField
  }
  processes: ExtractedField[]
  notes: Array<{
    contenu: string
    confiance: number
    raison: string
  }>
}

export interface AnalysisResult {
  id: string
  fileName: string
  timestamp: Date
  rawData: any
  extractedData: ExtractedData
}

export interface Material {
  id: string
  type: string
  dimensions: string
  standardLength: number
  unit: string
  costPerUnit: number
}

export interface Formula {
  id: string
  name: string
  condition: string
  formula: string
  description: string
}

export interface ClientProfile {
  id: string
  name: string
  materials: Material[]
  formulas: Formula[]
}

export interface CalculationResult {
  piecesPerBar: number
  estimatedCost: number
  selectedMaterial: Material
  appliedFormula: Formula | null
  details: string
  variables: Record<string, any>
}
