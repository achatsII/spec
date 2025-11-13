// ============================================
// TYPES DE BASE POUR L'EXTRACTION
// ============================================

export interface ExtractedField {
  valeur: string | number | any
  confiance: number
  raison: string
}

export interface DimensionField extends ExtractedField {
  valeur: string | number
  unite: string
}

export interface ComplexField extends ExtractedField {
  valeur: any // Peut être un objet structuré
  properties?: Record<string, any> // Propriétés additionnelles pour champs complexes
}

// ============================================
// DONNÉES EXTRAITES (FLEXIBLES)
// ============================================

export interface ExtractedData {
  // Champs standards (toujours présents)
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

  // Champs personnalisés (définis par les profils d'extraction)
  customFields?: Record<string, ExtractedField | ComplexField>
}

export interface AnalysisResult {
  id: string
  fileName: string
  timestamp: Date
  rawData: any
  extractedData: ExtractedData
  fileUrl?: string
  fileType?: string
}

// ============================================
// CLIENT
// ============================================

export interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// ============================================
// MATIÈRES PREMIÈRES (TABLE SÉPARÉE)
// ============================================

export interface RawMaterial {
  id: string
  name: string              // Ex: "Tube carré acier 1.5x1.5x0.1"
  category: string          // Ex: "Tube", "Plat", "Cornière", "Plaque"
  material: string          // Ex: "Acier", "Aluminium", "Inox"
  dimensions: string        // Ex: "1.5x1.5x0.1"
  standardLength: number    // Longueur standard en unités
  unit: string             // "mm", "pouces", "cm"
  costPerUnit: number      // Coût par unité
  supplier?: string        // Fournisseur
  reference?: string       // Référence fournisseur
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// ============================================
// CHAMPS EXTRACTIBLES (PROFILS D'EXTRACTION)
// ============================================

export interface ExtractableField {
  id: string
  name: string               // Ex: "trous", "plis", "soudures"
  label: string             // Label d'affichage
  type: "simple" | "complex" | "dimension" | "array"
  dataType?: "string" | "number" | "boolean" // Type de données attendu

  // Pour les champs complexes (ex: trous)
  structure?: {
    properties: Array<{
      name: string          // Ex: "quantité", "dimension", "type"
      type: string         // "string", "number"
      required: boolean
    }>
  }

  required: boolean
  unit?: string            // Unité si applicable
  prompt: string          // Instruction spécifique pour l'IA
  examples?: string[]     // Exemples pour l'IA
}

// ============================================
// FORMULES PERSONNALISÉES
// ============================================

export interface CustomFormula {
  id: string
  name: string
  description: string
  category: "time" | "cost" | "quantity" | "optimization" | "other"
  formula: string           // Expression mathématique utilisant les champs extraits
  unit?: string            // Unité du résultat (heures, $, pièces, etc.)
  variables: string[]      // Liste des variables utilisées dans la formule
  condition?: string       // Condition pour appliquer la formule (optionnel)
}

// ============================================
// PROFIL D'EXTRACTION (REFACTORISÉ)
// ============================================

export interface ExtractionProfile {
  id: string
  name: string
  description?: string

  // Champs à extraire (en plus des champs standards)
  customFields: ExtractableField[]

  // Formules de calcul personnalisées
  formulas: CustomFormula[]

  // Matériaux compatibles (références aux IDs de RawMaterial)
  compatibleMaterialIds?: string[]

  createdAt: Date
  updatedAt: Date
}

// ============================================
// RÉSULTATS DE CALCUL (ENRICHIS)
// ============================================

export interface FormulaResult {
  formulaId: string
  formulaName: string
  category: string
  value: number | string
  result?: number // Alias pour value (compatibilité)
  unit?: string
  variables: Record<string, any>
  details?: string
  formula?: string // Formule utilisée (pour affichage)
}

export interface CalculationResult {
  // Résultats standards (optimisation matériaux)
  piecesPerBar?: number
  estimatedCost?: number
  selectedMaterial?: RawMaterial
  optimizationDetails?: string

  // Résultats de toutes les formules personnalisées
  formulaResults: FormulaResult[]

  // Métadonnées
  calculatedAt: Date
  profileUsed: string
}

// ============================================
// ANALYSE SAUVEGARDÉE
// ============================================

export interface SavedAnalysis {
  id: string
  title: string
  clientId: string
  clientName?: string
  profileId: string
  profileName?: string
  fileName: string
  fileUrl?: string
  fileType?: string
  analysisResult: AnalysisResult
  calculationResult: CalculationResult | null
  status: "draft" | "analyzed" | "validated" | "completed"
  validated: boolean
  contextText?: string
  quantity?: number
  createdAt: Date
  updatedAt: Date
  createdBy?: string
  tags?: string[]
}

// ============================================
// LEGACY (RÉTROCOMPATIBILITÉ TEMPORAIRE)
// ============================================

/** @deprecated Utiliser RawMaterial à la place */
export interface Material {
  id: string
  type: string
  dimensions: string
  standardLength: number
  unit: string
  costPerUnit: number
}

/** @deprecated Utiliser CustomFormula à la place */
export interface Formula {
  id: string
  name: string
  condition: string
  formula: string
  description: string
}

/** @deprecated Utiliser ExtractionProfile à la place */
export interface ClientProfile {
  id: string
  name: string
  materials: Material[]
  formulas: Formula[]
}
