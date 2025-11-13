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
    setCalculationsValidated(false)
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
  }

  const handleValidateCalculations = () => {
    if (!calculationResult) return
    setCalculationsValidated(true)
    setCurrentStep(4)
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

  const resetForm = () => {
    setCurrentStep(1)
    setSelectedFile(null)
    setAnalysisResult(null)
    setCalculationResult(null)
    setIsValidated(false)
    setCalculationsValidated(false)
    setAnalysisTitle("")
    setContextText("")
    setQuantity(1)
  }


  // ÉTAPE 1 : CONFIGURATION
  const renderStep1 = () => {
    return (
      <div className="h-[calc(100vh-280px)] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
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
                  <div className="grid grid-cols-2 gap-3">
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
              <div className="grid grid-cols-2 gap-3 flex-shrink-0">
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
      <div className="min-h-[calc(100vh-280px)] overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
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
                  <FilePreview file={selectedFile} fileUrl={analysisResult?.fileUrl} />
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
      <div className="h-[calc(100vh-280px)] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
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

        {/* Navigation entre les étapes */}
        {(currentStep > 1 || analysisResult) && (
          <div className="flex justify-between items-center bg-white rounded-lg shadow-sm border p-4">
                        <Button
              variant="outline"
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1) as 1 | 2 | 3 | 4)}
              disabled={currentStep === 1}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Étape précédente</span>
                        </Button>

            <div className="text-sm text-gray-600">
              Étape {currentStep} sur 4
          </div>

            {currentStep < 4 && (
                <Button
                variant="outline"
                onClick={() => {
                  if (currentStep === 2 && isValidated) {
                    setCurrentStep(3)
                  } else if (currentStep === 3) {
                    // Permettre de passer à l'étape suivante même sans valider les calculs
                    setCurrentStep(4)
                  }
                }}
                disabled={
                  (currentStep === 2 && !isValidated)
                }
                className="flex items-center gap-2"
              >
                <span className="hidden sm:inline">Étape suivante</span>
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
