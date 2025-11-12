"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileText, Settings, Calculator, BarChart3 } from "lucide-react"
import FileUpload from "@/components/file-upload"
import ClientProfileSelector from "@/components/client-profile-selector"
import AnalysisResults from "@/components/analysis-results"
import CalculationEngine from "@/components/calculation-engine"
import type { ClientProfile, AnalysisResult, CalculationResult } from "@/types/analysis"
import ErrorBoundary from "@/components/error-boundary"

export default function TechnicalDrawingAnalyzer() {
  const [selectedProfile, setSelectedProfile] = useState<ClientProfile | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)

  const handleFileAnalyzed = (result: AnalysisResult) => {
    setAnalysisResult(result)
    setCalculationResult(null)
  }

  const handleCalculationComplete = (result: CalculationResult) => {
    setCalculationResult(result)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header avec logo de l'entreprise */}
        <div className="text-center py-8 bg-white rounded-lg shadow-sm border">
          <div className="flex items-center justify-center gap-6 mb-6">
            {/* Logo Intelligence Industrielle */}
            <div className="flex-shrink-0">
              <img
                src="https://cdn.prod.website-files.com/661e90e3758529bd15e6c71f/68377030906f9e242965bc39_logo%20light%20version.svg"
                alt="Intelligence Industrielle"
                className="h-16 w-auto"
                onError={(e) => {
                  // Fallback en cas d'erreur de chargement
                  e.currentTarget.style.display = "none"
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement
                  if (fallback) fallback.style.display = "flex"
                }}
              />
              {/* Fallback logo */}
              <div
                className="h-16 w-16 bg-[#0078FF] rounded-lg flex items-center justify-center"
                style={{ display: "none" }}
              >
                <span className="text-white font-bold text-xl">II</span>
              </div>
            </div>

            {/* Séparateur visuel */}
            <div className="h-12 w-px bg-gray-300"></div>

            {/* Branding InPlan */}
            <div className="text-left">
              <h1 className="text-4xl font-bold text-gray-900 mb-1">InPlan</h1>
              <p className="text-lg text-[#0078FF] font-medium">Pipeline d'analyse</p>
            </div>
          </div>

          <p className="text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Solution d'analyse automatique de dessins techniques avec estimation de coûts et optimisation de matériaux
          </p>

          {/* Badge de version ou statut */}
          <div className="mt-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#0078FF]/10 text-[#0078FF]">
              Version 0.0.1 • Intelligence Industrielle
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Configuration */}
          <div className="space-y-6">
            {/* Client Profile Selection */}
            <Card className="border-[#0078FF]/20">
              <CardHeader className="bg-[#0078FF]/5">
                <CardTitle className="flex items-center gap-2 text-[#0078FF]">
                  <Settings className="h-5 w-5" />
                  Configuration Client
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ErrorBoundary>
                  <ClientProfileSelector selectedProfile={selectedProfile} onProfileSelect={setSelectedProfile} />
                </ErrorBoundary>
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card className="border-[#0078FF]/20">
              <CardHeader className="bg-[#0078FF]/5">
                <CardTitle className="flex items-center gap-2 text-[#0078FF]">
                  <Upload className="h-5 w-5" />
                  Import du Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <FileUpload
                  onFileAnalyzed={handleFileAnalyzed}
                  clientProfile={selectedProfile}
                  isAnalyzing={isAnalyzing}
                  setIsAnalyzing={setIsAnalyzing}
                />
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Analysis Results */}
          <div className="space-y-6">
            <Card className="border-[#0078FF]/20">
              <CardHeader className="bg-[#0078FF]/5">
                <CardTitle className="flex items-center gap-2 text-[#0078FF]">
                  <FileText className="h-5 w-5" />
                  Données Extraites
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {analysisResult ? (
                  <AnalysisResults result={analysisResult} onResultUpdate={setAnalysisResult} />
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="font-medium">Aucun plan analysé</p>
                    <p className="text-sm">Uploadez un fichier pour commencer l'analyse</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Calculations */}
          <div className="space-y-6">
            <Card className="border-[#0078FF]/20">
              <CardHeader className="bg-[#0078FF]/5">
                <CardTitle className="flex items-center gap-2 text-[#0078FF]">
                  <BarChart3 className="h-5 w-5" />
                  Calculs Réalisés
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {analysisResult && selectedProfile ? (
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
                    <p className="text-sm">Configurez un profil et analysez un plan</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer avec branding complet */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src="https://cdn.prod.website-files.com/661e90e3758529bd15e6c71f/68377030906f9e242965bc39_logo%20light%20version.svg"
                alt="Intelligence Industrielle"
                className="h-8 w-auto opacity-60"
                onError={(e) => {
                  e.currentTarget.style.display = "none"
                }}
              />
              <div className="text-sm text-gray-500">
                <p className="font-medium">InPlan - Pipeline d'analyse</p>
                <p>© 2025 Intelligence Industrielle • Tous droits réservés</p>
              </div>
            </div>

            <div className="text-right text-sm text-gray-400">
              <p>Version 0.0.1</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
