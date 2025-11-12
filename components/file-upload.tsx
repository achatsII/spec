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
      let instruction = `Tu es un ingenieur industriel specialise dans l interpretation rigoureuse de plans techniques. Tu dois extraire des informations techniques precises, structurees et exploitables automatiquement a partir d un dessin technique. Extraire toutes les informations necessaires a l estimation de prix ou a la fabrication d une piece. Ces donnees doivent etre normalisees, fiables, structurees, contextualisees et accompagnees d un niveau de confiance et d une justification. Tu dois repondre en JSON structure, avec pour chaque champ: valeur (valeur extraite ou deduite), confiance (un score de 0 a 100), raison (explication de comment tu as obtenu la valeur). Format attendu: {reference_dessin: {valeur: ..., confiance: 95, raison: Present dans le cartouche}, description: {valeur: ..., confiance: 80, raison: Mention dans le cartouche ou texte descriptif}, materiau: {valeur: ..., confiance: 100, raison: Indique dans la zone materiau}, type_piece: {valeur: tube | plat | corniere | plaque | autre, confiance: 90, raison: Deduit de la geometrie ou du texte}, dimensions: {longueur: {valeur: ..., unite: ..., confiance: ..., raison: ...}, largeur: {valeur: ..., unite: ..., confiance: ..., raison: ...}, hauteur: {valeur: ..., unite: ..., confiance: ..., raison: ...}, epaisseur: {valeur: ..., unite: ..., confiance: ..., raison: ...}}, procedes: [{valeur: decoupe laser | pliage | percage | taraudage | filetage | autre, confiance: 90, raison: Indique dans la legende ou infere du plan}], notes_importantes: [{contenu: ..., confiance: 80, raison: Note visible sur le plan technique}]`

      // Ajouter les instructions spécifiques du profil d'extraction si disponible
      if (clientProfile) {
        // Ajouter la description du profil comme instruction système
        if (clientProfile.description && clientProfile.description.trim()) {
          instruction += `\n\nINSTRUCTIONS SPECIFIQUES DU PROFIL D'EXTRACTION "${clientProfile.name}":\n${clientProfile.description.trim()}\n\nCes instructions sont prioritaires et doivent etre suivies precisement. Assure-toi d'extraire toutes les informations mentionnees dans ces instructions, notamment dans les notes_importantes si pertinent.`
        }

        // Ajouter les champs personnalisés du profil
        if (clientProfile.customFields && clientProfile.customFields.length > 0) {
          instruction += `\n\nCHAMPS PERSONNALISES A EXTRAIRE:\n`
          clientProfile.customFields.forEach((field) => {
            const fieldDescription = field.prompt || `Extraire ${field.label || field.name}`
            instruction += `- ${field.name}: ${fieldDescription}\n`
          })
          
          instruction += `\nCes champs doivent etre inclus dans champs_personnalises avec le format suivant: champs_personnalises: {`
          const customFieldsPrompts = clientProfile.customFields.map((field) => {
            const fieldDescription = field.prompt || `Extraire ${field.label || field.name}`
            if (field.type === "complex" && field.structure) {
              const properties = field.structure.properties.map((p) => `${p.name}: ...`).join(", ")
              return `${field.name}: {${properties}, confiance: ..., raison: "${fieldDescription}"}`
            } else if (field.type === "array") {
              return `${field.name}: [{valeur: ..., confiance: ..., raison: "${fieldDescription}"}]`
            } else {
              return `${field.name}: {valeur: ..., confiance: ..., raison: "${fieldDescription}"}`
            }
          })
          instruction += customFieldsPrompts.join(", ")
          instruction += `}`
        }
      }

      instruction += `}. Ne jamais inventer d information si elle n est pas visible. Toujours expliquer comment chaque valeur a ete trouvee. Si une unite est implicite, tu peux la deduire mais avec prudence. Utilise ton jugement d expert pour identifier des procedes ou types standards. Tu dois rendre la sortie exploitable automatiquement: pas de texte hors JSON. En cas de doute: si une valeur est manquante ou illisible, utilise valeur: Non specifie avec confiance: 0 et une raison claire.`

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
        // Extraire les champs personnalisés si présents
        const customFields: Record<string, any> = {}
        if (data.analysisData.champs_personnalises) {
          Object.entries(data.analysisData.champs_personnalises).forEach(([key, value]) => {
            customFields[key] = value
          })
        }

        const result: AnalysisResult = {
          id: Date.now().toString(),
          fileName: selectedFile.name,
          timestamp: new Date(),
          rawData: data.analysisData,
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
        error.message.includes("CORS") || error.message.includes("NetworkError")
          ? "Problème de connexion réseau. Veuillez réessayer ou contacter le support."
          : `Erreur lors de l'analyse: ${error.message}`

      setError(errorMessage)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <div className="border-2 border-dashed border-[#0078FF]/30 rounded-lg p-6 text-center hover:border-[#0078FF]/50 transition-colors">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
        />

        {selectedFile ? (
          <div className="space-y-2">
            <FileText className="h-12 w-12 mx-auto text-[#0078FF]" />
            <p className="text-sm font-medium">{selectedFile.name}</p>
            <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-12 w-12 mx-auto text-gray-400" />
            <p className="text-sm text-gray-600">Glissez un fichier ici ou cliquez pour sélectionner</p>
            <p className="text-xs text-gray-500">PDF, PNG, JPG (max 15MB)</p>
          </div>
        )}

        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="mt-4 border-[#0078FF] text-[#0078FF] hover:bg-[#0078FF] hover:text-white"
          disabled={isAnalyzing}
        >
          Sélectionner un fichier
        </Button>
      </div>

      {selectedFile && (
        <Button
          onClick={analyzeFile}
          disabled={isAnalyzing || !clientProfile}
          className="w-full bg-[#0078FF] hover:bg-[#0078FF]/90"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyse en cours...
            </>
          ) : (
            "Analyser le plan"
          )}
        </Button>
      )}

      {!clientProfile && selectedFile && (
        <p className="text-sm text-amber-600 text-center">Veuillez sélectionner un profil client avant l'analyse</p>
      )}
    </div>
  )
}
