"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, FileText, Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { ExtractionProfile, AnalysisResult } from "@/types/analysis"

interface FileUploadProps {
  onFileAnalyzed: (result: AnalysisResult) => void
  clientProfile: ExtractionProfile | null
  isAnalyzing: boolean
  setIsAnalyzing: (analyzing: boolean) => void
  onFileSelected?: (file: File) => void
  contextText?: string
}

export default function FileUpload({ onFileAnalyzed, clientProfile, isAnalyzing, setIsAnalyzing, onFileSelected, contextText }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setError(null)
      if (onFileSelected) {
        onFileSelected(file)
      }
    }
  }

  const analyzeFile = async () => {
    if (!selectedFile) return

    setIsAnalyzing(true)
    setError(null)

    try {
      // Générer l'instruction de base
      let instruction = `Tu es un ingenieur industriel specialise dans l interpretation rigoureuse de plans techniques. Tu dois extraire des informations techniques precises, structurees et exploitables automatiquement a partir d un dessin technique. Extraire toutes les informations necessaires a l estimation de prix ou a la fabrication d une piece. Ces donnees doivent etre normalisees, fiables, structurees, contextualisees et accompagnees d un niveau de confiance et d une justification.

IMPORTANT: Tu dois repondre UNIQUEMENT avec un tableau JSON d'objets. Chaque objet doit avoir les cles suivantes:
- "name": le nom du champ (ex: "reference_dessin", "description", "materiau", "type_piece", "longueur", "largeur", "hauteur", "epaisseur", "procedes", "notes_importantes", etc.)
- "data_type": le type de donnees ("string", "number", "boolean", "array", "object", etc.)
- "value": la valeur extraite (peut etre une string, un nombre, un objet, ou un tableau selon le type)
- "confidence": un score de confiance entre 0 et 100
- "justification": l'explication de comment la valeur a ete obtenue

Format attendu:
[
  {
    "name": "reference_dessin",
    "data_type": "string",
    "value": "...",
    "confidence": 95,
    "justification": "Present dans le cartouche"
  },
  {
    "name": "description",
    "data_type": "string",
    "value": "...",
    "confidence": 80,
    "justification": "Mention dans le cartouche ou texte descriptif"
  },
  {
    "name": "materiau",
    "data_type": "string",
    "value": "...",
    "confidence": 100,
    "justification": "Indique dans la zone materiau"
  },
  {
    "name": "type_piece",
    "data_type": "string",
    "value": "tube | plat | corniere | plaque | autre",
    "confidence": 90,
    "justification": "Deduit de la geometrie ou du texte"
  },
  {
    "name": "longueur",
    "data_type": "number",
    "value": 100,
    "confidence": 95,
    "justification": "Mesure sur le plan"
  },
  {
    "name": "procedes",
    "data_type": "array",
    "value": ["decoupe laser", "pliage", "percage"],
    "confidence": 90,
    "justification": "Indique dans la legende ou infere du plan"
  }
]`

      // Ajouter les instructions spécifiques du profil d'extraction si disponible
      if (clientProfile) {
        // Générer automatiquement le prompt du profil avec le format JSON par défaut
        instruction += `\n\nPROFIL D'EXTRACTION "${clientProfile.name}"\n`
        instruction += `Analyse le document technique. Extrais les informations suivantes: `

        // Construire la liste des détails de champs
        const fieldDetails: string[] = []
        if (clientProfile.customFields && clientProfile.customFields.length > 0) {
          clientProfile.customFields.forEach((field) => {
            const fieldInstruction = field.instruction || `Extraire ${field.label || field.name}`
            fieldDetails.push(`${field.name} (${field.label}): ${fieldInstruction}`)
          })
        }
        
        if (fieldDetails.length > 0) {
          instruction += fieldDetails.join(", ")
        }

        instruction += `\n\nCes champs doivent etre inclus dans le tableau JSON avec le format standard (name, data_type, value, confidence, justification).`
      }

      instruction += `\n\nNe jamais inventer d information si elle n est pas visible. Toujours expliquer comment chaque valeur a ete trouvee. Si une unite est implicite, tu peux la deduire mais avec prudence. Utilise ton jugement d expert pour identifier des procedes ou types standards. Tu dois rendre la sortie exploitable automatiquement: pas de texte hors JSON. En cas de doute: si une valeur est manquante ou illisible, utilise value: "Non specifie" avec confidence: 0 et une justification claire.`

      // Ajouter le contexte texte si fourni
      if (contextText && contextText.trim()) {
        instruction += `\n\nCONTEXTE ADDITIONNEL FOURNI PAR L'UTILISATEUR:\n${contextText.trim()}\n\nUtilise ce contexte pour enrichir et contextualiser ton analyse. Si le contexte contient des informations pertinentes (ex: courriel, notes, specifications), prends-les en compte pour ameliorer la precision de l'extraction.`
      }

      // Appel à l'API d'analyse via notre API route pour éviter CORS
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("prompt", instruction)

      console.log("Envoi de la requête via API route...")

      const response = await fetch("/api/analyze-file", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`)
      }

      const data = await response.json()
      console.log("Réponse de l'API:", data)

      if (data.success && data.analysisData) {
        // Sauvegarder les traces des agents dans les données brutes
        if (data.traces && Array.isArray(data.traces)) {
          data.analysisData._traces = data.traces
        }
        // Extraire les champs personnalisés si présents
        console.log("🔍 Données brutes reçues:", JSON.stringify(data.analysisData, null, 2))
        console.log("🔍 champs_personnalises présents?", !!data.analysisData.champs_personnalises)
        
        const customFields: Record<string, any> = {}
        if (data.analysisData.champs_personnalises) {
          console.log("🔍 Contenu de champs_personnalises:", JSON.stringify(data.analysisData.champs_personnalises, null, 2))
          Object.entries(data.analysisData.champs_personnalises).forEach(([key, value]) => {
            console.log(`🔍 Ajout champ personnalisé: ${key}`, value)
            customFields[key] = value
          })
        }
        console.log("🔍 customFields final:", JSON.stringify(customFields, null, 2))

        const result: AnalysisResult = {
          id: Date.now().toString(),
          fileName: selectedFile.name,
          timestamp: new Date(),
          rawData: data.analysisData,
          fileUrl: data.fileUrl, // URL du fichier pour le preview
          fileType: data.fileType || selectedFile.type, // Type du fichier
          extractedData: {
            reference: data.analysisData.référence_dessin ||
              data.analysisData.reference_dessin || {
                valeur: "Non spécifié",
                confiance: 0,
                raison: "Non trouvé",
              },
            description: data.analysisData.description || {
              valeur: "Non spécifié",
              confiance: 0,
              raison: "Non trouvé",
            },
            material: data.analysisData.matériau ||
              data.analysisData.materiau || { valeur: "Non spécifié", confiance: 0, raison: "Non trouvé" },
            pieceType: data.analysisData.type_pièce ||
              data.analysisData.type_piece || { valeur: "autre", confiance: 0, raison: "Non trouvé" },
            dimensions: data.analysisData.dimensions || {},
            processes: data.analysisData.procédés || data.analysisData.procedes || [],
            notes: data.analysisData.notes_importantes || [],
            customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
          },
        }

        console.log("Résultat final:", result)
        onFileAnalyzed(result)
      } else {
        throw new Error(data.error || "Erreur lors de l'analyse")
      }
    } catch (error) {
      console.error("Erreur complète:", error)
      const errorMessage =
        (error instanceof Error && (error.message.includes("CORS") || error.message.includes("NetworkError")))
          ? "Problème de connexion réseau. Veuillez réessayer ou contacter le support."
          : `Erreur lors de l'analyse: ${error instanceof Error ? error.message : "Erreur inconnue"}`

      setError(errorMessage)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="space-y-2 flex flex-col h-full">
      {error && (
        <Alert className="border-red-200 bg-red-50 flex-shrink-0">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <div className="border-2 border-dashed border-[#0078FF]/30 rounded-lg p-3 text-center hover:border-[#0078FF]/50 transition-colors flex-shrink-0">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
        />

        {selectedFile ? (
          <div className="space-y-1">
            <FileText className="h-8 w-8 mx-auto text-[#0078FF]" />
            <p className="text-xs font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        ) : (
          <div className="space-y-1">
            <Upload className="h-8 w-8 mx-auto text-gray-400" />
            <p className="text-xs text-gray-600">Glissez un fichier ici</p>
            <p className="text-xs text-gray-500">PDF, PNG, JPG</p>
          </div>
        )}

        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          size="sm"
          className="mt-2 h-7 text-xs border-[#0078FF] text-[#0078FF] hover:bg-[#0078FF] hover:text-white"
          disabled={isAnalyzing}
        >
          Sélectionner
        </Button>
      </div>

      {selectedFile && (
        <Button
          onClick={analyzeFile}
          disabled={isAnalyzing || !clientProfile}
          className="w-full bg-[#0078FF] hover:bg-[#0078FF]/90 h-8 text-sm flex-shrink-0"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
              Analyse...
            </>
          ) : (
            "Analyser le plan"
          )}
        </Button>
      )}

      {!clientProfile && selectedFile && (
        <p className="text-xs text-amber-600 text-center flex-shrink-0">Sélectionnez un profil avant l'analyse</p>
      )}
    </div>
  )
}
