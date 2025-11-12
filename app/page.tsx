"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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

  const handleFileSelected = (file: File) => {
    setSelectedFile(file)
    // Générer un titre automatique basé sur le nom du fichier
    const titleFromFile = file.name.replace(/\.(pdf|png|jpg|jpeg)$/i, "")
    setAnalysisTitle(titleFromFile)
  }

  const handleFileAnalyzed = (result: AnalysisResult) => {
    setAnalysisResult(result)
    setCalculationResult(null)
    setIsValidated(false)
    setCurrentStep(2)

    // Améliorer le titre si une référence est trouvée
    if (result.extractedData.reference?.valeur && result.extractedData.reference.valeur !== "Non spécifié") {
      setAnalysisTitle(result.extractedData.reference.valeur)
    }
  }

  const handleValidateAnalysis = () => {
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
    setCurrentStep(3)
  }

  const handleCalculationComplete = (result: CalculationResult) => {
    setCalculationResult(result)
    setCurrentStep(4)
  }

  const handleSaveAnalysis = async () => {
    if (!selectedClient || !selectedProfile || !analysisResult) {
      alert("Veuillez compléter toutes les informations requises")
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
        // Optionnel : réinitialiser le formulaire
        if (confirm("Voulez-vous créer une nouvelle analyse ?")) {
          resetForm()
        }
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

  const resetForm = () => {
    setCurrentStep(1)
    setSelectedFile(null)
    setAnalysisResult(null)
    setCalculationResult(null)
    setIsValidated(false)
    setAnalysisTitle("")
    setContextText("")
    setQuantity(1)
  }

  const canProceedToStep2 = selectedClient && selectedProfile && analysisResult
  const canProceedToStep3 = canProceedToStep2 && isValidated
  const canProceedToStep4 = canProceedToStep3 && calculationResult

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header avec logo et navigation */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-6">
              {/* Logo Intelligence Industrielle */}
              <div className="flex-shrink-0">
                <img
                  src="https://cdn.prod.website-files.com/661e90e3758529bd15e6c71f/68377030906f9e242965bc39_logo%20light%20version.svg"
                  alt="Intelligence Industrielle"
                  className="h-12 w-auto"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                  }}
                />
              </div>

              <div className="h-8 w-px bg-gray-300"></div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">InPlan</h1>
                <p className="text-sm text-[#0078FF]">Pipeline d'analyse de dessins techniques</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Link href="/clients">
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Clients
                </Button>
              </Link>
              <Link href="/materials">
                <Button variant="outline">
                  <Package className="h-4 w-4 mr-2" />
                  Matériaux
                </Button>
              </Link>
              <Link href="/profiles">
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Profils
                </Button>
              </Link>
              <Link href="/analyses">
                <Button variant="outline">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Historique
                </Button>
              </Link>
            </div>
          </div>

          {/* Indicateur de progression */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 1 ? "bg-[#0078FF] text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                1
              </div>
              <span className={`text-sm ${currentStep >= 1 ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                Configuration
              </span>
            </div>

            <div className="flex-1 h-1 bg-gray-200 rounded">
              <div
                className="h-full bg-[#0078FF] rounded transition-all"
                style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
              />
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 2 ? "bg-[#0078FF] text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                2
              </div>
              <span className={`text-sm ${currentStep >= 2 ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                Validation
              </span>
            </div>

            <div className="flex-1 h-1 bg-gray-200 rounded">
              <div
                className="h-full bg-[#0078FF] rounded transition-all"
                style={{ width: `${currentStep >= 3 ? "100%" : "0%"}` }}
              />
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 3 ? "bg-[#0078FF] text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                3
              </div>
              <span className={`text-sm ${currentStep >= 3 ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                Calculs
              </span>
            </div>

            <div className="flex-1 h-1 bg-gray-200 rounded">
              <div
                className="h-full bg-[#0078FF] rounded transition-all"
                style={{ width: `${currentStep >= 4 ? "100%" : "0%"}` }}
              />
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 4 ? "bg-[#0078FF] text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                4
              </div>
              <span className={`text-sm ${currentStep >= 4 ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                Sauvegarde
              </span>
            </div>
          </div>
        </div>

        {/* Main Content - 4 colonnes responsive */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Colonne 1 : Configuration */}
          <div className="space-y-6">
            {/* Informations de base */}
            <Card className="border-[#0078FF]/20">
              <CardHeader className="bg-[#0078FF]/5">
                <CardTitle className="flex items-center gap-2 text-[#0078FF] text-base">
                  <Settings className="h-5 w-5" />
                  Informations
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Titre de l'analyse <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={analysisTitle}
                    onChange={(e) => setAnalysisTitle(e.target.value)}
                    placeholder="Ex: Support fixation REF-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantité de pièces</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="context">Contexte (optionnel)</Label>
                  <Textarea
                    id="context"
                    value={contextText}
                    onChange={(e) => setContextText(e.target.value)}
                    placeholder="Collez ici un courriel ou des notes..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Sélection client */}
            <Card className="border-[#0078FF]/20">
              <CardHeader className="bg-[#0078FF]/5">
                <CardTitle className="flex items-center gap-2 text-[#0078FF] text-base">
                  <Users className="h-5 w-5" />
                  Client <span className="text-red-500">*</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ErrorBoundary>
                  <ClientSelector selectedClient={selectedClient} onClientSelect={setSelectedClient} />
                </ErrorBoundary>
              </CardContent>
            </Card>

            {/* Sélection profil */}
            <Card className="border-[#0078FF]/20">
              <CardHeader className="bg-[#0078FF]/5">
                <CardTitle className="flex items-center gap-2 text-[#0078FF] text-base">
                  <Settings className="h-5 w-5" />
                  Profil d'extraction <span className="text-red-500">*</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ErrorBoundary>
                  <ExtractionProfileSelector selectedProfile={selectedProfile} onProfileSelect={setSelectedProfile} />
                </ErrorBoundary>
              </CardContent>
            </Card>

            {/* Upload */}
            <Card className="border-[#0078FF]/20">
              <CardHeader className="bg-[#0078FF]/5">
                <CardTitle className="flex items-center gap-2 text-[#0078FF] text-base">
                  <Upload className="h-5 w-5" />
                  Fichier du plan <span className="text-red-500">*</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <FileUpload
                  onFileAnalyzed={handleFileAnalyzed}
                  clientProfile={selectedProfile}
                  isAnalyzing={isAnalyzing}
                  setIsAnalyzing={setIsAnalyzing}
                  onFileSelected={handleFileSelected}
                />
              </CardContent>
            </Card>
          </div>

          {/* Colonne 2 : Aperçu du fichier */}
          <div className="space-y-6">
            <Card className="border-[#0078FF]/20">
              <CardHeader className="bg-[#0078FF]/5">
                <CardTitle className="flex items-center gap-2 text-[#0078FF] text-base">
                  <Eye className="h-5 w-5" />
                  Aperçu du plan
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <FilePreview file={selectedFile} />
              </CardContent>
            </Card>
          </div>

          {/* Colonne 3 : Données extraites */}
          <div className="space-y-6">
            <Card className="border-[#0078FF]/20">
              <CardHeader className="bg-[#0078FF]/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-[#0078FF] text-base">
                    <FileText className="h-5 w-5" />
                    Données Extraites
                  </CardTitle>
                  {isValidated && <Badge className="bg-green-100 text-green-800">✓ Validé</Badge>}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {analysisResult ? (
                  <>
                    <AnalysisResults result={analysisResult} onResultUpdate={setAnalysisResult} />

                    {!isValidated && (
                      <div className="mt-6 space-y-3">
                        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-yellow-800">
                            <p className="font-medium">Validation requise</p>
                            <p>Vérifiez et validez les données avant de continuer</p>
                          </div>
                        </div>

                        <Button
                          onClick={handleValidateAnalysis}
                          className="w-full bg-green-600 hover:bg-green-700"
                          disabled={!analysisResult}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Valider les données
                        </Button>
                      </div>
                    )}

                    {isValidated && (
                      <div className="mt-6">
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-sm text-green-800 font-medium">Données validées et prêtes</span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="font-medium">Aucun plan analysé</p>
                    <p className="text-sm">Uploadez un fichier pour commencer</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Colonne 4 : Calculs et Sauvegarde */}
          <div className="space-y-6">
            {/* Calculs */}
            <Card className="border-[#0078FF]/20">
              <CardHeader className="bg-[#0078FF]/5">
                <CardTitle className="flex items-center gap-2 text-[#0078FF] text-base">
                  <BarChart3 className="h-5 w-5" />
                  Calculs d'optimisation
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {analysisResult && selectedProfile && isValidated ? (
                  <CalculationEngine
                    analysisResult={analysisResult}
                    clientProfile={selectedProfile}
                    onCalculationComplete={handleCalculationComplete}
                    isCalculating={isCalculating}
                    setIsCalculating={setIsCalculating}
                  />
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="font-medium">Prêt pour les calculs</p>
                    <p className="text-sm">Validez d'abord les données extraites</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sauvegarde */}
            <Card className="border-green-500/20">
              <CardHeader className="bg-green-50">
                <CardTitle className="flex items-center gap-2 text-green-700 text-base">
                  <Save className="h-5 w-5" />
                  Sauvegarde de l'analyse
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Client:</span>
                    <span className="font-medium">{selectedClient?.name || "Non sélectionné"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Titre:</span>
                    <span className="font-medium">{analysisTitle || "Non défini"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Analysé:</span>
                    <Badge variant={analysisResult ? "default" : "secondary"}>
                      {analysisResult ? "Oui" : "Non"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Validé:</span>
                    <Badge variant={isValidated ? "default" : "secondary"}>{isValidated ? "Oui" : "Non"}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Calculé:</span>
                    <Badge variant={calculationResult ? "default" : "secondary"}>
                      {calculationResult ? "Oui" : "Non"}
                    </Badge>
                  </div>
                </div>

                <Button
                  onClick={handleSaveAnalysis}
                  disabled={!selectedClient || !selectedProfile || !analysisResult || isSaving}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isSaving ? (
                    <>
                      <Calculator className="h-4 w-4 mr-2 animate-spin" />
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Sauvegarder l'analyse
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-gray-500">
                  {!selectedClient && "Sélectionnez un client"}
                  {selectedClient && !selectedProfile && "Sélectionnez un profil"}
                  {selectedClient && selectedProfile && !analysisResult && "Analysez un plan"}
                  {selectedClient && selectedProfile && analysisResult && !isValidated && "Validez les données"}
                  {selectedClient && selectedProfile && analysisResult && isValidated && "Prêt à sauvegarder"}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white rounded-lg shadow-sm border p-4 text-center text-sm text-gray-500">
          <p>© 2025 Intelligence Industrielle • InPlan v0.1.0 • Tous droits réservés</p>
        </div>
      </div>
    </div>
  )
}
