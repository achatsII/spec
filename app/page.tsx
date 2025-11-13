"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  Upload,
  FileText,
  Settings,
  Calculator,
  BarChart3,
  Users,
  FolderOpen,
  CheckCircle,
  AlertCircle,
  Save,
  Eye,
  Package,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
} from "lucide-react"
import FileUpload from "@/components/file-upload"
import ExtractionProfileSelector from "@/components/extraction-profile-selector"
import ClientSelector from "@/components/client-selector"
import AnalysisResults from "@/components/analysis-results"
import CalculationEngine from "@/components/calculation-engine"
import FilePreview from "@/components/file-preview"
import type { Client, ExtractionProfile, AnalysisResult, CalculationResult, SavedAnalysis } from "@/types/analysis"
import ErrorBoundary from "@/components/error-boundary"
import Link from "next/link"

export default function TechnicalDrawingAnalyzer() {
  // États pour le workflow
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)

  // États existants
  const [selectedProfile, setSelectedProfile] = useState<ExtractionProfile | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)

  // Nouveaux états
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [analysisTitle, setAnalysisTitle] = useState("")
  const [contextText, setContextText] = useState("")
  const [quantity, setQuantity] = useState<number>(1)
  const [isValidated, setIsValidated] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [calculationsValidated, setCalculationsValidated] = useState(false)
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null)
  const [parentAnalysisId, setParentAnalysisId] = useState<string | null>(null)
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null)
  const [validatedDataSnapshot, setValidatedDataSnapshot] = useState<string | null>(null) // Snapshot des données au moment de la validation
  const [isSavingAuto, setIsSavingAuto] = useState(false) // Pour éviter les sauvegardes simultanées
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string | null>(null) // Snapshot de la dernière sauvegarde pour détecter les modifications

  // Fonction pour créer un snapshot de l'état actuel pour détecter les modifications
  const createCurrentSnapshot = () => {
    return JSON.stringify({
      title: analysisTitle,
      contextText,
      quantity,
      extractedData: analysisResult?.extractedData,
      calculationResult: calculationResult ? {
        piecesPerBar: calculationResult.piecesPerBar,
        estimatedCost: calculationResult.estimatedCost,
        selectedMaterial: calculationResult.selectedMaterial?.id,
      } : null,
      validated: isValidated,
      calculationsValidated,
      currentStep,
    })
  }

  // Fonction pour vérifier si les données ont été modifiées
  const hasDataChanged = () => {
    if (!lastSavedSnapshot) return true // Première sauvegarde
    const currentSnapshot = createCurrentSnapshot()
    return currentSnapshot !== lastSavedSnapshot
  }

  const handleFileSelected = (file: File) => {
    setSelectedFile(file)
    // Générer un titre automatique basé sur le nom du fichier
    const titleFromFile = file.name.replace(/\.(pdf|png|jpg|jpeg)$/i, "")
    setAnalysisTitle(titleFromFile)
  }

  const handleFileAnalyzed = async (result: AnalysisResult) => {
    setAnalysisResult(result)
    setCalculationResult(null)
    setIsValidated(false)
    setCalculationsValidated(false)
    setCurrentStep(2)

    // Améliorer le titre si une référence est trouvée ET que le titre n'a pas été défini manuellement
    // Ne mettre à jour le titre que s'il est vide ou s'il correspond au nom du fichier
    if (result.extractedData.reference?.valeur && result.extractedData.reference.valeur !== "Non spécifié") {
      const currentTitle = analysisTitle || ""
      const titleFromFile = selectedFile?.name.replace(/\.(pdf|png|jpg|jpeg)$/i, "") || ""
      // Ne mettre à jour que si le titre actuel est vide ou correspond au nom du fichier
      if (!currentTitle || currentTitle === titleFromFile) {
        setAnalysisTitle(result.extractedData.reference.valeur)
      }
    }

    // Sauvegarder automatiquement dès que l'analyse est terminée (V1)
    setTimeout(async () => {
      if (selectedClient && selectedProfile && result) {
        await autoSaveAnalysis(2, false, false, true) // forceNewVersion = true pour V1
      } else {
        console.log("Sauvegarde différée: attente de client/profil")
        setTimeout(async () => {
          if (selectedClient && selectedProfile && result) {
            await autoSaveAnalysis(2, false, false, true)
          }
        }, 1000)
      }
    }, 200)
  }

  const handleValidateAnalysis = async () => {
    if (!analysisResult) return

    // Vérifier que les champs critiques sont présents
    const hasReference = analysisResult.extractedData.reference?.valeur !== "Non spécifié"
    const hasMaterial = analysisResult.extractedData.material?.valeur !== "Non spécifié"
    const hasDimensions = analysisResult.extractedData.dimensions?.longueur?.valeur

    if (!hasReference || !hasMaterial || !hasDimensions) {
      if (
        !confirm(
          "Certaines informations critiques sont manquantes ou ont une faible confiance. Voulez-vous tout de même valider ?"
        )
      ) {
        return
      }
    }

    setIsValidated(true)
    // Créer un snapshot des données validées pour détecter les modifications ultérieures
    setValidatedDataSnapshot(JSON.stringify(analysisResult.extractedData))
    setCurrentStep(3)

    // Sauvegarder automatiquement après validation
    if (selectedClient && selectedProfile) {
      setTimeout(() => {
        autoSaveAnalysis(3, true, calculationsValidated)
      }, 200)
    }
  }

  const handleCalculationComplete = (result: CalculationResult) => {
    setCalculationResult(result)
  }

  const handleValidateCalculations = async () => {
    if (!calculationResult) return
    setCalculationsValidated(true)
    setCurrentStep(4)

    // Sauvegarder automatiquement après validation des calculs
    if (selectedClient && selectedProfile) {
      setTimeout(() => {
        autoSaveAnalysis(4, true, true)
      }, 200)
    }
  }

  const handleSaveAnalysis = async () => {
    if (!selectedClient || !selectedProfile || !analysisResult) {
      alert("Veuillez compléter toutes les informations requises")
      return
    }

    if (!quantity || quantity < 1) {
      alert("La quantité de pièces est obligatoire et doit être d'au moins 1")
      return
    }

    setIsSaving(true)

    try {
      const savedAnalysis: SavedAnalysis = {
        id: `analysis_${Date.now()}`,
        title: analysisTitle || "Analyse sans titre",
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        profileId: selectedProfile.id,
        profileName: selectedProfile.name,
        fileName: analysisResult.fileName,
        fileUrl: analysisResult.fileUrl,
        fileType: analysisResult.fileType,
        analysisResult: analysisResult,
        calculationResult: calculationResult,
        status: calculationResult ? "completed" : isValidated ? "validated" : "analyzed",
        validated: isValidated,
        contextText: contextText || undefined,
        quantity: quantity || 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
      }

      const response = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savedAnalysis),
      })

      const data = await response.json()

      if (data.success) {
        alert("Analyse sauvegardée avec succès !")
          resetForm()
      } else {
        alert("Erreur lors de la sauvegarde: " + (data.error || "Erreur inconnue"))
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error)
      alert("Erreur lors de la sauvegarde de l'analyse")
    } finally {
      setIsSaving(false)
    }
  }

  // Fonction de sauvegarde avec versioning complet
  const autoSaveAnalysis = async (step: 1 | 2 | 3 | 4, validated: boolean, calculationsValidated: boolean, forceNewVersion = false) => {
    // Éviter les sauvegardes simultanées
    if (isSavingAuto) {
      console.log("⏳ Sauvegarde déjà en cours, ignorée")
      return
    }

    // Vérifier les conditions minimales pour sauvegarder
    if (!analysisResult) {
      console.log("Sauvegarde automatique ignorée: pas de résultat d'analyse")
      return
    }

    // Vérifier client et profil (obligatoires)
    if (!selectedClient || !selectedProfile) {
      console.log("Sauvegarde automatique ignorée: client ou profil manquant")
      return
    }

    // Vérifier si les données ont changé (sauf si forceNewVersion)
    if (!forceNewVersion && !hasDataChanged()) {
      console.log("💡 Aucune modification détectée, sauvegarde ignorée")
      return
    }

    setIsSavingAuto(true)

    try {
      console.log("💾 Sauvegarde avec versioning en cours...", {
        step,
        validated,
        calculationsValidated,
        title: analysisTitle,
        hasParentId: !!parentAnalysisId,
        forceNewVersion
      })

      // Déterminer le statut selon l'étape
      let status: "draft" | "analyzed" | "validated" | "completed" = "draft"
      if (step >= 2) status = "analyzed"
      if (validated) status = "validated"
      if (calculationsValidated) status = "completed"

      const now = new Date().toISOString()

      // S'assurer que analysisResult a un timestamp en string pour la sauvegarde
      const analysisResultToSave: any = {
        ...analysisResult,
        timestamp: analysisResult.timestamp instanceof Date
          ? analysisResult.timestamp.toISOString()
          : (typeof analysisResult.timestamp === 'string'
              ? analysisResult.timestamp
              : new Date().toISOString()),
      }

      // Déterminer le numéro de version
      let versionNumber = 1
      let effectiveParentId = parentAnalysisId

      // Si on a un parentId, récupérer toutes les versions pour calculer le numéro
      if (parentAnalysisId) {
        try {
          const versionsResponse = await fetch(`/api/analyses?parentId=${parentAnalysisId}`)
          const versionsData = await versionsResponse.json()
          if (versionsData.success && Array.isArray(versionsData.analyses)) {
            // Trouver le numéro de version le plus élevé
            const maxVersion = versionsData.analyses.reduce((max: number, analysis: any) => {
              return Math.max(max, analysis.versionNumber || 1)
            }, 1)
            versionNumber = maxVersion + 1
          }
        } catch (error) {
          console.error("Erreur lors de la récupération des versions:", error)
        }
      } else if (currentAnalysisId) {
        // Si on charge depuis l'historique sans parentId, utiliser currentAnalysisId comme parent
        effectiveParentId = currentAnalysisId
        versionNumber = 2 // Première modification = V2
      }

      // Marquer l'ancienne version comme non-latest si elle existe
      if (currentAnalysisId && !currentAnalysisId.startsWith("analysis_")) {
        try {
          await fetch(`/api/analyses/${currentAnalysisId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isLatest: false }),
          })
        } catch (error) {
          console.error("Erreur lors de la mise à jour de l'ancienne version:", error)
        }
      }

      // Créer une nouvelle version
      console.log("➕ Création d'une nouvelle version:", versionNumber)

      const savedAnalysis: SavedAnalysis = {
        id: `analysis_${Date.now()}`,
        title: analysisTitle || "Analyse sans titre",
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        profileId: selectedProfile.id,
        profileName: selectedProfile.name,
        fileName: analysisResult.fileName,
        fileUrl: analysisResult.fileUrl,
        fileType: analysisResult.fileType,
        analysisResult: analysisResultToSave as AnalysisResult,
        calculationResult: calculationResult || null,
        status: status,
        validated: validated,
        contextText: contextText || undefined,
        quantity: quantity || 1,
        createdAt: new Date(now),
        updatedAt: new Date(now),
        currentStep: step,
        parentId: effectiveParentId || undefined,
        versionNumber: versionNumber,
        isLatest: true,
      }

      const response = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savedAnalysis),
      })

      const data = await response.json()

      if (data.success && data.id) {
        // Mettre à jour les IDs pour les prochaines sauvegardes
        if (!effectiveParentId) {
          setParentAnalysisId(data.id) // V1 devient le parent
        } else {
          setParentAnalysisId(effectiveParentId) // Garder le parent original
        }
        setCurrentAnalysisId(data.id) // L'ID de la nouvelle version

        // Mettre à jour le snapshot de la dernière sauvegarde
        setLastSavedSnapshot(createCurrentSnapshot())

        console.log("✅ Nouvelle version sauvegardée:", {
          id: data.id,
          version: versionNumber,
          parentId: effectiveParentId,
          step,
          status,
          title: analysisTitle
        })
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde automatique:", error)
    } finally {
      setIsSavingAuto(false)
    }
  }

  // Gérer le changement d'étape avec sauvegarde automatique
  const handleStepChange = async (newStep: 1 | 2 | 3 | 4, preserveValidations = false) => {
    const oldStep = currentStep

    // Si on essaie d'avancer à l'étape 3 depuis l'étape 2 sans validation, bloquer
    if (oldStep === 2 && newStep === 3 && !isValidated) {
      console.log("⚠️ Impossible d'avancer: les données doivent être validées")
      return
    }

    setCurrentStep(newStep)

    // Si on recule et qu'on ne préserve pas les validations, réinitialiser
    if (newStep < oldStep && !preserveValidations) {
      if (newStep < 2) {
        setIsValidated(false)
        setCalculationsValidated(false)
        setValidatedDataSnapshot(null)
      } else if (newStep < 3) {
        // Si on revient à l'étape 2 depuis l'étape 3, ne pas réinitialiser la validation
        // La validation sera réinitialisée automatiquement si les données sont modifiées
        setCalculationsValidated(false)
      } else if (newStep < 4) {
        setCalculationsValidated(false)
      }
    }

    // Sauvegarder automatiquement lors du changement d'étape
    if (analysisResult && selectedClient && selectedProfile) {
      setTimeout(() => {
        autoSaveAnalysis(
          newStep,
          isValidated && newStep >= 2,
          calculationsValidated && newStep >= 3
        )
      }, 200)
    }
  }

  const loadAnalysis = async (analysisId: string) => {
    try {
      console.log("🔄 Chargement de l'analyse:", analysisId)
      const response = await fetch(`/api/analyses/${analysisId}`)
      const data = await response.json()

      console.log("📥 Réponse brute de l'API pour ID:", analysisId, {
        success: data.success,
        hasAnalysis: !!data.analysis,
        keys: data.analysis ? Object.keys(data.analysis) : [],
        error: data.error,
        debug: data.debug,
        fullResponse: data
      })

      if (!data.success) {
        console.error("❌ Erreur API pour ID:", analysisId, {
          error: data.error,
          debug: data.debug,
          fullResponse: data
        })
        alert(`Erreur lors du chargement de l'analyse "${analysisId}": ${data.error || "Erreur inconnue"}`)
        return
      }

      if (!data.analysis) {
        console.error("❌ Analyse manquante dans la réponse:", data)
        alert("Erreur: L'analyse n'a pas pu être chargée")
        return
      }

      const analysis: SavedAnalysis = data.analysis
      console.log("📦 Analyse reçue:", {
        id: analysis.id,
        title: analysis.title,
        hasFileUrl: !!analysis.fileUrl,
        hasAnalysisResult: !!analysis.analysisResult,
        hasAnalysisResultFileUrl: !!analysis.analysisResult?.fileUrl,
        currentStep: analysis.currentStep,
        analysisKeys: analysis.analysisResult ? Object.keys(analysis.analysisResult) : [],
      })

      // Charger le client
      if (analysis.clientId) {
        try {
          const clientResponse = await fetch(`/api/clients/${analysis.clientId}`)
          const clientData = await clientResponse.json()
          if (clientData.success && clientData.client) {
            setSelectedClient(clientData.client)
          } else {
            // Si le chargement échoue, créer un client minimal à partir des données sauvegardées
            console.warn("⚠️ Impossible de charger le client complet, création d'un client minimal")
            if (analysis.clientId && analysis.clientName) {
              setSelectedClient({
                id: analysis.clientId,
                name: analysis.clientName,
                createdAt: analysis.createdAt instanceof Date ? analysis.createdAt : new Date(analysis.createdAt),
                updatedAt: analysis.updatedAt instanceof Date ? analysis.updatedAt : new Date(analysis.updatedAt),
              })
            }
          }
        } catch (error) {
          console.error("Erreur lors du chargement du client:", error)
          // En cas d'erreur, créer un client minimal à partir des données sauvegardées
          if (analysis.clientId && analysis.clientName) {
            console.warn("⚠️ Création d'un client minimal à partir des données sauvegardées")
            setSelectedClient({
              id: analysis.clientId,
              name: analysis.clientName,
              createdAt: analysis.createdAt instanceof Date ? analysis.createdAt : new Date(analysis.createdAt),
              updatedAt: analysis.updatedAt instanceof Date ? analysis.updatedAt : new Date(analysis.updatedAt),
            })
          }
        }
      }

      // Charger le profil
      if (analysis.profileId) {
        try {
          const profileResponse = await fetch(`/api/extraction-profiles/${analysis.profileId}`)
          const profileData = await profileResponse.json()
          if (profileData.success && profileData.profile) {
            setSelectedProfile(profileData.profile)
          } else {
            // Si le chargement échoue, on ne peut pas créer un profil minimal car il nécessite des données complexes
            console.error("❌ Impossible de charger le profil d'extraction")
          }
        } catch (error) {
          console.error("Erreur lors du chargement du profil:", error)
        }
      }

      // Restaurer les données
      setAnalysisTitle(analysis.title)
      setContextText(analysis.contextText || "")
      setQuantity(analysis.quantity || 1)
      
      // Vérifier que analysisResult existe
      if (!analysis.analysisResult) {
        console.error("Erreur: analysisResult est manquant dans l'analyse chargée")
        alert("Erreur: Les données d'analyse sont manquantes")
        return
      }
      
      // Restaurer l'analyse avec le fileUrl pour le preview
      // Le fileUrl peut être au niveau racine de l'analyse ou dans analysisResult
      const fileUrl = analysis.fileUrl || analysis.analysisResult?.fileUrl
      const fileType = analysis.fileType || analysis.analysisResult?.fileType
      
      console.log("🔗 FileUrl restauré:", {
        fromRoot: !!analysis.fileUrl,
        fromAnalysisResult: !!analysis.analysisResult?.fileUrl,
        finalFileUrl: fileUrl,
      })
      
      // Convertir le timestamp en Date si c'est une string
      const timestamp = analysis.analysisResult.timestamp
        ? (typeof analysis.analysisResult.timestamp === 'string' 
            ? new Date(analysis.analysisResult.timestamp) 
            : analysis.analysisResult.timestamp instanceof Date
            ? analysis.analysisResult.timestamp
            : new Date(analysis.analysisResult.timestamp))
        : new Date()
      
      const restoredAnalysisResult: AnalysisResult = {
        ...analysis.analysisResult,
        timestamp: timestamp,
        fileUrl: fileUrl || undefined,
        fileType: fileType || undefined,
      }
      
      console.log("✅ AnalysisResult restauré:", {
        hasFileUrl: !!restoredAnalysisResult.fileUrl,
        hasFileType: !!restoredAnalysisResult.fileType,
        timestamp: restoredAnalysisResult.timestamp,
      })
      
      setAnalysisResult(restoredAnalysisResult)
      setCalculationResult(analysis.calculationResult || null)
      
      // Restaurer l'étape et les validations selon l'étape sauvegardée
      const savedStep = analysis.currentStep || 2
      
      // Restaurer les validations exactement comme elles étaient sauvegardées
      // Si l'analyse a le statut "validated" ou "completed", les données étaient validées
      const wasValidated = analysis.validated || analysis.status === "validated" || analysis.status === "completed"
      setIsValidated(wasValidated)
      
      // Si l'analyse était validée, créer un snapshot des données validées
      if (wasValidated && analysis.analysisResult) {
        setValidatedDataSnapshot(JSON.stringify(analysis.analysisResult.extractedData))
      }
      
      // Si l'analyse a le statut "completed", les calculs étaient validés
      setCalculationsValidated(analysis.status === "completed")
      
      // Restaurer l'étape exacte sauvegardée (ne pas forcer à l'étape 2)
      setCurrentStep(savedStep)
      
      // S'assurer qu'on utilise l'ID MongoDB et non un ID client
      // L'ID MongoDB devrait être dans analysis.id (retourné par l'API)
      // Vérifier que ce n'est pas un ID client (format: analysis_...)
      const mongoId = analysis.id && !analysis.id.startsWith("analysis_") 
        ? analysis.id 
        : null
      
      if (mongoId) {
        setCurrentAnalysisId(mongoId)
        setParentAnalysisId(analysis.parentId || mongoId)
      } else {
        console.warn("⚠️ ID MongoDB manquant dans l'analyse chargée, utilisation de l'ID de l'URL:", analysisId)
        // Si l'ID de l'URL est un ID MongoDB, l'utiliser
        const urlMongoId = analysisId && !analysisId.startsWith("analysis_") ? analysisId : null
        if (urlMongoId) {
          setCurrentAnalysisId(urlMongoId)
          setParentAnalysisId(analysis.parentId || urlMongoId)
        } else {
          console.error("❌ Impossible de déterminer l'ID MongoDB pour cette analyse")
        }
      }

      // Initialiser le snapshot de la dernière sauvegarde
      // Attendre que tous les états soient mis à jour
      setTimeout(() => {
        setLastSavedSnapshot(createCurrentSnapshot())
      }, 500)

      console.log("✅ Analyse chargée depuis l'historique:", {
        id: analysis.id,
        version: analysis.versionNumber,
        step: savedStep,
        validated: analysis.validated,
        fileUrl: analysis.fileUrl,
        hasAnalysisResult: !!analysis.analysisResult
      })
    } catch (error) {
      console.error("Erreur lors du chargement de l'analyse:", error)
      alert("Erreur lors du chargement de l'analyse")
    }
  }

  // Charger une analyse depuis l'URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const loadAnalysisId = params.get("load")
      if (loadAnalysisId) {
        loadAnalysis(loadAnalysisId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sauvegarder automatiquement après l'analyse initiale
  useEffect(() => {
    if (analysisResult && selectedClient && selectedProfile && currentStep === 2 && !currentAnalysisId) {
      console.log("✅ Auto-sauvegarde déclenchée après analyse complète")

      const timeout = setTimeout(() => {
        autoSaveAnalysis(currentStep, isValidated, calculationsValidated)
      }, 300)

      return () => clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisResult, selectedClient, selectedProfile, currentStep, currentAnalysisId])

  // Détecter les modifications des données extraites et réinitialiser la validation si nécessaire
  useEffect(() => {
    // Si on est à l'étape 2 ou 3 et que les données ont été validées
    if (analysisResult && isValidated && validatedDataSnapshot && (currentStep === 2 || currentStep === 3)) {
      const currentDataSnapshot = JSON.stringify(analysisResult.extractedData)

      // Si les données ont changé depuis la validation, réinitialiser la validation
      if (currentDataSnapshot !== validatedDataSnapshot) {
        console.log("⚠️ Données modifiées après validation, réinitialisation de la validation")
        setIsValidated(false)
        setValidatedDataSnapshot(null)
        // Si on était à l'étape 3, revenir à l'étape 2 pour forcer la re-validation
        if (currentStep === 3) {
          setCurrentStep(2)
        }

        // Sauvegarder immédiatement après réinitialisation de la validation
        setTimeout(() => {
          if (selectedClient && selectedProfile && analysisResult) {
            autoSaveAnalysis(2, false, false)
          }
        }, 100)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisResult?.extractedData])

  // Sauvegarder automatiquement quand les données sont modifiées (avec debounce)
  useEffect(() => {
    // Ne sauvegarder que si on a déjà une analyse sauvegardée
    if (analysisResult && selectedClient && selectedProfile && currentStep >= 2 && currentAnalysisId) {
      // Annuler le timeout précédent
      if (saveTimeout) {
        clearTimeout(saveTimeout)
      }

      // Créer un nouveau timeout pour sauvegarder après 2 secondes d'inactivité
      const timeout = setTimeout(() => {
        console.log("💾 Auto-sauvegarde après modification des données (debounce 2s)")
        autoSaveAnalysis(currentStep, isValidated, calculationsValidated)
      }, 2000)

      setSaveTimeout(timeout)

      return () => clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisResult?.extractedData, analysisTitle, contextText, quantity, currentStep, isValidated, calculationsValidated, currentAnalysisId])

  const resetForm = () => {
    // Nettoyer le timeout de sauvegarde
    if (saveTimeout) {
      clearTimeout(saveTimeout)
      setSaveTimeout(null)
    }
    
    setCurrentStep(1)
    setSelectedFile(null)
    setAnalysisResult(null)
    setCalculationResult(null)
    setIsValidated(false)
    setCalculationsValidated(false)
    setAnalysisTitle("")
    setContextText("")
    setQuantity(1)
    setCurrentAnalysisId(null)
    setParentAnalysisId(null)
  }


  // ÉTAPE 1 : CONFIGURATION
  const renderStep1 = () => {
    return (
      <div className="h-[calc(100vh-280px)] sm:h-[calc(100vh-320px)] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 h-full">
          {/* Colonne gauche : Configuration */}
          <div className="lg:col-span-1 h-full flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col gap-3 overflow-hidden">
              {/* Informations de base - Compact */}
              <Card className="border-[#0078FF]/20 flex-shrink-0">
                <CardHeader className="bg-[#0078FF]/5 py-2 px-4">
                  <CardTitle className="flex items-center gap-2 text-[#0078FF] text-sm">
                    <Settings className="h-4 w-4" />
                    Informations
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 pb-3 px-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="title" className="text-xs">
                        Titre <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="title"
                        value={analysisTitle}
                        onChange={(e) => setAnalysisTitle(e.target.value)}
                        placeholder="Ex: REF-001"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="quantity" className="text-xs">
                        Quantité <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        required
                        value={quantity}
                        onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <Label htmlFor="context" className="text-xs">Contexte (optionnel)</Label>
                    <Textarea
                      id="context"
                      value={contextText}
                      onChange={(e) => setContextText(e.target.value)}
                      placeholder="Courriel ou notes..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Client et Profil sur la même ligne */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-shrink-0">
                <Card className="border-[#0078FF]/20">
                  <CardHeader className="bg-[#0078FF]/5 py-2 px-4">
                    <CardTitle className="flex items-center gap-2 text-[#0078FF] text-sm">
                      <Users className="h-4 w-4" />
                      Client <span className="text-red-500">*</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 pb-3 px-4">
                    <ErrorBoundary>
                      <ClientSelector selectedClient={selectedClient} onClientSelect={setSelectedClient} />
                    </ErrorBoundary>
                  </CardContent>
                </Card>

                <Card className="border-[#0078FF]/20">
                  <CardHeader className="bg-[#0078FF]/5 py-2 px-4">
                    <CardTitle className="flex items-center gap-2 text-[#0078FF] text-sm">
                      <Settings className="h-4 w-4" />
                      Profil <span className="text-red-500">*</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 pb-3 px-4">
                    <ErrorBoundary>
                      <ExtractionProfileSelector selectedProfile={selectedProfile} onProfileSelect={setSelectedProfile} />
                    </ErrorBoundary>
                  </CardContent>
                </Card>
              </div>

              {/* Upload - Compact */}
              <Card className="border-[#0078FF]/20 flex-1 flex flex-col overflow-hidden">
                <CardHeader className="bg-[#0078FF]/5 py-2 px-4 flex-shrink-0">
                  <CardTitle className="flex items-center gap-2 text-[#0078FF] text-sm">
                    <Upload className="h-4 w-4" />
                    Fichier du plan <span className="text-red-500">*</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 pb-3 px-4 flex-1 overflow-hidden">
                  <FileUpload
                    onFileAnalyzed={handleFileAnalyzed}
                    clientProfile={selectedProfile}
                    isAnalyzing={isAnalyzing}
                    setIsAnalyzing={setIsAnalyzing}
                    onFileSelected={handleFileSelected}
                    contextText={contextText}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Colonne droite : Aperçu du plan */}
          <div className="lg:col-span-1 h-full flex flex-col min-h-0">
            <Card className="border-[#0078FF]/20 h-full flex flex-col min-h-0">
              <CardHeader className="bg-[#0078FF]/5 flex-shrink-0 py-2 px-4">
                <CardTitle className="flex items-center gap-2 text-[#0078FF] text-sm">
                  <Eye className="h-4 w-4" />
                  Aperçu du plan
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 p-0 flex-1 min-h-0 overflow-hidden">
                <FilePreview file={selectedFile} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // ÉTAPE 2 : VALIDATION
  const renderStep2 = () => {
    return (
      <div className="min-h-[calc(100vh-280px)] sm:min-h-[calc(100vh-320px)] overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 pb-4 sm:pb-6">
          {/* Colonne gauche : Aperçu du plan (gros) */}
          <div className="lg:col-span-1 flex flex-col">
            <Card className="border-[#0078FF]/20 flex flex-col">
              <CardHeader className="bg-[#0078FF]/5 flex-shrink-0">
                <CardTitle className="flex items-center gap-2 text-[#0078FF] text-lg">
                  <Eye className="h-6 w-6" />
                  Aperçu du plan
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 p-0 min-h-[600px]">
                <div className="h-full w-full min-h-[600px]">
                  <FilePreview file={selectedFile} fileUrl={analysisResult?.fileUrl} enableZoom={true} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite : Données extraites */}
          <div className="lg:col-span-1 flex flex-col">
            <Card className="border-[#0078FF]/20 flex flex-col">
              <CardHeader className="bg-[#0078FF]/5 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-[#0078FF] text-lg">
                    <FileText className="h-6 w-6" />
                    Données Extraites
                  </CardTitle>
                  {isValidated && <Badge className="bg-green-100 text-green-800">✓ Validé</Badge>}
                </div>
              </CardHeader>
              <CardContent className="pt-6 flex-1 flex flex-col">
                {analysisResult ? (
                  <div className="flex flex-col">
                    <div className="flex-1">
                      <AnalysisResults result={analysisResult} onResultUpdate={setAnalysisResult} />
                    </div>

                    {/* Section Traces des Agents */}
                    {analysisResult.rawData?._traces && Array.isArray(analysisResult.rawData._traces) && analysisResult.rawData._traces.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="agent-traces">
                            <AccordionTrigger className="text-sm font-medium">
                              <div className="flex items-center gap-2">
                                <Settings className="h-4 w-4" />
                                Traces des Agents ({analysisResult.rawData._traces.length})
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-3 pt-2">
                                {analysisResult.rawData._traces.map((trace: any, index: number) => {
                                  // Debug: vérifier la longueur du prompt
                                  const promptLength = trace?.input?.prompt ? (typeof trace.input.prompt === 'string' ? trace.input.prompt.length : JSON.stringify(trace.input.prompt).length) : 0
                                  console.log(`[Trace ${index}] Agent: ${trace.agent}, Prompt length: ${promptLength}`)
                                  return (
                                  <Card key={index} className="border-blue-200 bg-blue-50/30">
                                    <CardHeader className="pb-2">
                                      <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-semibold text-blue-900">
                                          {trace.agent || `Agent ${index + 1}`}
                                        </CardTitle>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="text-xs">
                                            {trace.duration ? `${trace.duration}ms` : "N/A"}
                                          </Badge>
                                          {trace.timestamp && (
                                            <span className="text-xs text-gray-500">
                                              {new Date(trace.timestamp).toLocaleTimeString()}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                      {/* Input */}
                                      <div>
                                        <Label className="text-xs font-semibold text-gray-700 mb-1 block">Input</Label>
                                        <div className="bg-white border border-gray-200 rounded p-3 text-xs font-mono">
                                          <div className="space-y-2">
                                            {trace.input?.fileName && (
                                              <div>
                                                <span className="text-gray-500">Fichier:</span>{" "}
                                                <span className="text-gray-900">{trace.input.fileName}</span>
                                              </div>
                                            )}
                                            {trace.input?.prompt && (
                                              <div className="mt-2">
                                                <div className="text-gray-500 mb-1 flex items-center gap-2">
                                                  <span>Prompt (complet):</span>
                                                  <span className="text-xs text-gray-400">
                                                    ({typeof trace.input.prompt === 'string' ? trace.input.prompt.length : JSON.stringify(trace.input.prompt).length} caractères)
                                                  </span>
                                                </div>
                                                <div className="bg-gray-50 border-2 border-gray-300 rounded p-3 max-h-[600px] overflow-y-auto overflow-x-auto">
                                                  <pre className="text-gray-900 whitespace-pre-wrap break-words text-xs leading-relaxed font-mono">
                                                    {(() => {
                                                      const promptText = typeof trace.input.prompt === 'string' 
                                                        ? trace.input.prompt 
                                                        : JSON.stringify(trace.input.prompt, null, 2)
                                                      console.log(`[Display] Prompt length: ${promptText.length}, First 100 chars: ${promptText.substring(0, 100)}...`)
                                                      return promptText
                                                    })()}
                                                  </pre>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Output */}
                                      <div>
                                        <Label className="text-xs font-semibold text-gray-700 mb-1 block">Output</Label>
                                        <div className="bg-white border border-gray-200 rounded p-3 text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto">
                                          <pre className="whitespace-pre-wrap break-words text-gray-900">
                                            {typeof trace.output === "object"
                                              ? JSON.stringify(trace.output, null, 2)
                                              : String(trace.output || "N/A")}
                                          </pre>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                  )
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </div>
                    )}

                    {!isValidated && (
                      <div className="space-y-3 pt-4 border-t flex-shrink-0 mt-4">
                        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-yellow-800">
                            <p className="font-medium">Validation requise</p>
                            <p>Vérifiez les données extraites en comparant avec le plan, puis validez pour continuer</p>
                          </div>
                        </div>

                        <Button
                          onClick={handleValidateAnalysis}
                          className="w-full bg-green-600 hover:bg-green-700 text-lg py-4"
                          disabled={!analysisResult}
                        >
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Valider les données extraites
                        </Button>
                      </div>
                    )}

                    {isValidated && (
                      <div className="pt-4 border-t flex-shrink-0 mt-4">
                        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                          <div>
                            <p className="text-sm font-medium text-green-800">Données validées avec succès</p>
                            <p className="text-xs text-green-700">Vous pouvez maintenant passer aux calculs</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="font-medium">Aucune donnée extraite</p>
                    <p className="text-sm">Retournez à l'étape Configuration pour analyser un plan</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // ÉTAPE 3 : CALCULS
  const renderStep3 = () => {
    return (
      <div className="h-[calc(100vh-280px)] sm:h-[calc(100vh-320px)] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 h-full">
          {/* Colonne gauche : Données extraites */}
          <div className="lg:col-span-1 h-full flex flex-col">
            <Card className="border-[#0078FF]/20 h-full flex flex-col">
              <CardHeader className="bg-[#0078FF]/5 flex-shrink-0">
                <CardTitle className="flex items-center gap-2 text-[#0078FF] text-lg">
                  <FileText className="h-6 w-6" />
                  Données Extraites
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 flex-1 overflow-hidden">
                {analysisResult ? (
                  <div className="h-full overflow-y-auto pr-2">
                    <AnalysisResults result={analysisResult} onResultUpdate={setAnalysisResult} />
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="font-medium">Aucune donnée extraite</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite : Calculs d'optimisation */}
          <div className="lg:col-span-1 h-full flex flex-col">
            <Card className="border-[#0078FF]/20 h-full flex flex-col">
              <CardHeader className="bg-[#0078FF]/5 flex-shrink-0">
                <CardTitle className="flex items-center gap-2 text-[#0078FF] text-lg">
                  <BarChart3 className="h-6 w-6" />
                  Calculs d'optimisation
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 flex-1 overflow-hidden flex flex-col">
                {analysisResult && selectedProfile && isValidated ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto pr-2">
                      <CalculationEngine
                        analysisResult={analysisResult}
                        clientProfile={selectedProfile}
                        onCalculationComplete={handleCalculationComplete}
                        isCalculating={isCalculating}
                        setIsCalculating={setIsCalculating}
                      />
                    </div>

                    {calculationResult && !calculationsValidated && (
                      <div className="space-y-3 pt-4 border-t flex-shrink-0">
                        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-blue-800">
                            <p className="font-medium">Calculs terminés</p>
                            <p>Vérifiez les résultats des calculs, puis validez pour continuer (optionnel)</p>
                          </div>
                        </div>

                        <Button
                          onClick={handleValidateCalculations}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-4"
                          disabled={!calculationResult}
                        >
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Valider les calculs
                        </Button>
                      </div>
                    )}

                    {!calculationResult && (
                      <div className="space-y-3 pt-4 border-t flex-shrink-0 mt-4">
                        <div className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <AlertCircle className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-gray-700">
                            <p className="font-medium">Calculs optionnels</p>
                            <p>Les calculs d'optimisation sont facultatifs. Vous pouvez passer à l'étape suivante pour sauvegarder uniquement les données extraites.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {calculationsValidated && (
                      <div className="pt-4 border-t flex-shrink-0">
                        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                          <div>
                            <p className="text-sm font-medium text-green-800">Calculs validés avec succès</p>
                            <p className="text-xs text-green-700">Vous pouvez maintenant sauvegarder l'analyse</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="font-medium">Prêt pour les calculs</p>
                    <p className="text-sm">Les données doivent être validées d'abord</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // ÉTAPE 4 : SAUVEGARDE
  const renderStep4 = () => {
    return (
      <div className="h-[calc(100vh-280px)] overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <Card className="border-green-500/20">
            <CardHeader className="bg-green-50">
              <CardTitle className="flex items-center gap-2 text-green-700 text-xl">
                <Save className="h-6 w-6" />
                Sauvegarde de l'analyse
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Résumé */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Résumé de l'analyse</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Client</div>
                    <div className="font-medium">{selectedClient?.name || "Non sélectionné"}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Profil d'extraction</div>
                    <div className="font-medium">{selectedProfile?.name || "Non sélectionné"}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Titre</div>
                    <div className="font-medium">{analysisTitle || "Non défini"}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Quantité</div>
                    <div className="font-medium">{quantity} pièce{quantity > 1 ? "s" : ""}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant={analysisResult ? "default" : "secondary"}>
                    {analysisResult ? "✓ Analysé" : "Non analysé"}
                  </Badge>
                  <Badge variant={isValidated ? "default" : "secondary"}>
                    {isValidated ? "✓ Validé" : "Non validé"}
                  </Badge>
                  <Badge variant={calculationResult ? "default" : "secondary"}>
                    {calculationResult ? "✓ Calculé" : "Non calculé"}
                  </Badge>
                </div>
              </div>

              {/* Bouton de sauvegarde */}
              <div className="space-y-3 pt-4 border-t">
                <Button
                  onClick={handleSaveAnalysis}
                  disabled={!selectedClient || !selectedProfile || !analysisResult || isSaving}
                  className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
                  size="lg"
                >
                  {isSaving ? (
                    <>
                      <Calculator className="h-5 w-5 mr-2 animate-spin" />
                      Sauvegarde en cours...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" />
                      Sauvegarder l'analyse
                    </>
                  )}
                </Button>

                {(!selectedClient || !selectedProfile || !analysisResult) && (
                  <p className="text-xs text-center text-red-500">
                    {!selectedClient && "Sélectionnez un client"}
                    {selectedClient && !selectedProfile && "Sélectionnez un profil"}
                    {selectedClient && selectedProfile && !analysisResult && "Analysez un plan"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header avec logo et navigation */}
        <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Logo Intelligence Industrielle */}
              <div className="flex-shrink-0">
                <img
                  src="https://cdn.prod.website-files.com/661e90e3758529bd15e6c71f/68377030906f9e242965bc39_logo%20light%20version.svg"
                  alt="Intelligence Industrielle"
                  className="h-10 sm:h-12 w-auto"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                  }}
                />
              </div>

              <div className="hidden sm:block h-8 w-px bg-gray-300"></div>

              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">InPlan</h1>
                <p className="text-xs sm:text-sm text-[#0078FF]">Pipeline d'analyse de dessins techniques</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
              <Link href="/clients">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Clients
                </Button>
              </Link>
              <Link href="/materials">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                  <Package className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Matériaux
                </Button>
              </Link>
              <Link href="/profiles">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                  <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Profils
                </Button>
              </Link>
              <Link href="/analyses">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                  <FolderOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Historique
                </Button>
              </Link>
            </div>
          </div>

          {/* Indicateur de progression - Responsive */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                  currentStep >= 1 ? "bg-[#0078FF] text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                1
              </div>
              <span className={`text-xs sm:text-sm ${currentStep >= 1 ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                <span className="hidden sm:inline">Configuration</span>
                <span className="sm:hidden">Config</span>
              </span>
            </div>

            <div className="hidden sm:block flex-1 h-1 bg-gray-200 rounded">
              <div
                className="h-full bg-[#0078FF] rounded transition-all"
                style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
              />
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                  currentStep >= 2 ? "bg-[#0078FF] text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                2
              </div>
              <span className={`text-xs sm:text-sm ${currentStep >= 2 ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                Validation
              </span>
            </div>

            <div className="hidden sm:block flex-1 h-1 bg-gray-200 rounded">
              <div
                className="h-full bg-[#0078FF] rounded transition-all"
                style={{ width: `${currentStep >= 3 ? "100%" : "0%"}` }}
              />
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                  currentStep >= 3 ? "bg-[#0078FF] text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                3
              </div>
              <span className={`text-xs sm:text-sm ${currentStep >= 3 ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                Calculs
              </span>
            </div>

            <div className="hidden sm:block flex-1 h-1 bg-gray-200 rounded">
              <div
                className="h-full bg-[#0078FF] rounded transition-all"
                style={{ width: `${currentStep >= 4 ? "100%" : "0%"}` }}
              />
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                  currentStep >= 4 ? "bg-[#0078FF] text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                4
              </div>
              <span className={`text-xs sm:text-sm ${currentStep >= 4 ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                <span className="hidden sm:inline">Sauvegarde</span>
                <span className="sm:hidden">Save</span>
              </span>
            </div>
          </div>
        </div>

        {/* Navigation entre les étapes */}
        {(currentStep > 1 || analysisResult) && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white rounded-lg shadow-sm border p-3 sm:p-4">
            <Button
              variant="outline"
              onClick={async () => {
                const newStep = Math.max(1, currentStep - 1) as 1 | 2 | 3 | 4
                await handleStepChange(newStep)
              }}
              disabled={currentStep === 1}
              className="flex items-center gap-2 w-full sm:w-auto text-xs sm:text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Étape précédente</span>
              <span className="sm:hidden">Précédent</span>
            </Button>

            <div className="text-xs sm:text-sm text-gray-600 font-medium">
              Étape {currentStep} sur 4
            </div>

            {currentStep < 4 && (
              <Button
                variant="outline"
                onClick={async () => {
                  if (currentStep === 2 && isValidated) {
                    await handleStepChange(3)
                  } else if (currentStep === 3) {
                    // Permettre de passer à l'étape suivante même sans valider les calculs
                    await handleStepChange(4)
                  }
                }}
                disabled={
                  (currentStep === 2 && !isValidated)
                }
                className="flex items-center gap-2 w-full sm:w-auto text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Étape suivante</span>
                <span className="sm:hidden">Suivant</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Contenu selon l'étape */}
        <ErrorBoundary>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </ErrorBoundary>

        {/* Footer */}
        <div className="bg-white rounded-lg shadow-sm border p-4 text-center text-xs sm:text-sm text-gray-500">
          <p>© 2025 Intelligence Industrielle • InPlan v0.1.0 • Tous droits réservés</p>
        </div>
      </div>
    </div>
  )
}
