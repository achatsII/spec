"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, FileText, Download, Trash2, Calendar, User, Package } from "lucide-react"
import type { SavedAnalysis, Client } from "@/types/analysis"
import Link from "next/link"

export default function AnalysesPage() {
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([])
  const [filteredAnalyses, setFilteredAnalyses] = useState<SavedAnalysis[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [clientFilter, setClientFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadAnalyses()
    loadClients()
  }, [])

  useEffect(() => {
    filterAnalyses()
  }, [searchQuery, statusFilter, clientFilter, analyses])

  const loadAnalyses = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/analyses")
      const data = await response.json()

      if (data.success && Array.isArray(data.analyses)) {
        setAnalyses(data.analyses)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des analyses:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadClients = async () => {
    try {
      const response = await fetch("/api/clients")
      const data = await response.json()

      if (data.success && Array.isArray(data.clients)) {
        setClients(data.clients)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des clients:", error)
    }
  }

  const filterAnalyses = () => {
    let filtered = [...analyses]

    // Par défaut, ne montrer que les dernières versions (isLatest: true ou pas de parentId)
    // Si une analyse a un parentId mais isLatest n'est pas défini, on la considère comme latest
    filtered = filtered.filter((analysis) => {
      // Si pas de parentId, c'est une analyse originale
      if (!analysis.parentId) return true
      // Si isLatest est true, c'est la dernière version
      if (analysis.isLatest === true) return true
      // Si isLatest n'est pas défini, on considère que c'est la dernière version (rétrocompatibilité)
      if (analysis.isLatest === undefined) return true
      // Sinon, c'est une ancienne version
      return false
    })

    // Filtre par recherche
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (analysis) =>
          analysis.title.toLowerCase().includes(query) ||
          analysis.fileName.toLowerCase().includes(query) ||
          analysis.clientName?.toLowerCase().includes(query)
      )
    }

    // Filtre par statut
    if (statusFilter !== "all") {
      filtered = filtered.filter((analysis) => analysis.status === statusFilter)
    }

    // Filtre par client
    if (clientFilter !== "all") {
      filtered = filtered.filter((analysis) => analysis.clientId === clientFilter)
    }

    // Trier par date (plus récent en premier)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    setFilteredAnalyses(filtered)
  }

  const handleDeleteAnalysis = async (analysisId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette analyse ?")) {
      return
    }

    try {
      const response = await fetch(`/api/analyses/${analysisId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        await loadAnalyses()
        // Optionnel: afficher un message de succès
        // alert("Analyse supprimée avec succès")
      } else {
        const errorMessage = data.error || "Erreur inconnue"
        console.error("Erreur lors de la suppression:", {
          analysisId,
          error: errorMessage,
          debug: data.debug
        })
        alert(`Erreur lors de la suppression: ${errorMessage}`)
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", {
        analysisId,
        error: error instanceof Error ? error.message : "Erreur inconnue"
      })
      alert(`Erreur lors de la suppression de l'analyse: ${error instanceof Error ? error.message : "Erreur inconnue"}`)
    }
  }

  const exportToCSV = () => {
    if (filteredAnalyses.length === 0) {
      alert("Aucune analyse à exporter")
      return
    }

    const headers = [
      "Titre",
      "Client",
      "Fichier",
      "Statut",
      "Validé",
      "Référence",
      "Matériau",
      "Type de pièce",
      "Pièces/Barre",
      "Coût/Pièce",
      "Date de création",
    ]

    const rows = filteredAnalyses.map((analysis) => [
      analysis.title,
      analysis.clientName || "",
      analysis.fileName,
      analysis.status,
      analysis.validated ? "Oui" : "Non",
      analysis.analysisResult?.extractedData?.reference?.valeur || "",
      analysis.analysisResult?.extractedData?.material?.valeur || "",
      analysis.analysisResult?.extractedData?.pieceType?.valeur || "",
      analysis.calculationResult?.piecesPerBar?.toString() || "",
      analysis.calculationResult?.estimatedCost?.toString() || "",
      new Date(analysis.createdAt).toLocaleDateString(),
    ])

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `analyses_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "validated":
        return "bg-blue-100 text-blue-800"
      case "analyzed":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Complété"
      case "validated":
        return "Validé"
      case "analyzed":
        return "Analysé"
      default:
        return "Brouillon"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <FileText className="h-8 w-8 text-[#0078FF]" />
                Historique des Analyses
              </h1>
              <p className="text-gray-600 mt-2">
                {filteredAnalyses.length} analyse{filteredAnalyses.length !== 1 ? "s" : ""} trouvée
                {filteredAnalyses.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Link href="/">
              <Button variant="outline">Retour à l'analyse</Button>
            </Link>
          </div>
        </div>

        {/* Filtres et Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Recherche et Filtres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Rechercher par titre, fichier ou client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtres */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Statut</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="analyzed">Analysé</SelectItem>
                    <SelectItem value="validated">Validé</SelectItem>
                    <SelectItem value="completed">Complété</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Client</label>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les clients</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button onClick={exportToCSV} variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Exporter CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des analyses */}
        <div className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">Chargement...</CardContent>
            </Card>
          ) : filteredAnalyses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                {searchQuery || statusFilter !== "all" || clientFilter !== "all"
                  ? "Aucune analyse trouvée avec ces critères"
                  : "Aucune analyse enregistrée"}
              </CardContent>
            </Card>
          ) : (
            filteredAnalyses.map((analysis) => (
              <Card key={analysis.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      {/* Titre et statut */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex flex-col">
                          <h3 className="text-lg font-semibold text-gray-900">{analysis.title || "Analyse sans titre"}</h3>
                          {analysis.analysisResult?.extractedData?.reference?.valeur && 
                           analysis.analysisResult.extractedData.reference.valeur !== "Non spécifié" &&
                           analysis.analysisResult.extractedData.reference.valeur !== analysis.title && (
                            <p className="text-sm text-gray-500 mt-1">
                              Référence: {analysis.analysisResult.extractedData.reference.valeur}
                            </p>
                          )}
                        </div>
                        <Badge className={getStatusColor(analysis.status)}>{getStatusLabel(analysis.status)}</Badge>
                        {analysis.validated && <Badge className="bg-green-100 text-green-800">✓ Validé</Badge>}
                        {analysis.currentStep && (
                          <Badge className="bg-blue-100 text-blue-800">
                            Étape {analysis.currentStep}/4
                          </Badge>
                        )}
                      </div>

                      {/* Informations */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="h-4 w-4" />
                          <span>{analysis.clientName || "Client inconnu"}</span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-600">
                          <FileText className="h-4 w-4" />
                          <span className="truncate">{analysis.fileName}</span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(analysis.createdAt).toLocaleDateString()}</span>
                        </div>

                        {analysis.quantity && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Package className="h-4 w-4" />
                            <span>{analysis.quantity} pièces</span>
                          </div>
                        )}
                      </div>

                      {/* Résultats */}
                      {analysis.calculationResult && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t">
                          <div>
                            <p className="text-xs text-gray-500">Matériau</p>
                            <p className="text-sm font-medium truncate">
                              {analysis.calculationResult.selectedMaterial.type}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Pièces/Barre</p>
                            <p className="text-sm font-medium text-[#0078FF]">
                              {analysis.calculationResult.piecesPerBar}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Coût/Pièce</p>
                            <p className="text-sm font-medium text-green-600">
                              ${analysis.calculationResult.estimatedCost.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Coût Total</p>
                            <p className="text-sm font-medium text-purple-600">
                              ${(analysis.calculationResult.estimatedCost * (analysis.quantity || 1)).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 ml-4">
                      {analysis.currentStep && analysis.currentStep < 4 && (
                        <Link href={`/?load=${analysis.id}`}>
                          <Button variant="default" size="sm" className="bg-[#0078FF] hover:bg-[#0078FF]/90">
                            Continuer
                          </Button>
                        </Link>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteAnalysis(analysis.id)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
