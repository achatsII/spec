"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, FileText, Download, Trash2, Calendar, User, Package, ChevronDown, ChevronRight, History } from "lucide-react"
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
  const [expandedAnalysis, setExpandedAnalysis] = useState<string | null>(null) // Pour afficher les versions

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

  // Récupérer toutes les versions d'une analyse
  const getVersions = (analysis: SavedAnalysis): SavedAnalysis[] => {
    const parentId = analysis.parentId || analysis.id
    return analyses
      .filter((a) => a.id === parentId || a.parentId === parentId)
      .sort((a, b) => (b.versionNumber || 1) - (a.versionNumber || 1))
  }

  const toggleVersions = (analysisId: string) => {
    if (expandedAnalysis === analysisId) {
      setExpandedAnalysis(null)
    } else {
      setExpandedAnalysis(analysisId)
    }
  }

  const filterAnalyses = () => {
    let filtered = [...analyses]

    // Grouper les analyses par parent ou par ID si pas de parent
    const groupedAnalyses = new Map<string, SavedAnalysis[]>()

    filtered.forEach((analysis) => {
      // Déterminer la clé de groupement (parentId ou l'ID lui-même si pas de parent)
      const groupKey = analysis.parentId || analysis.id

      if (!groupedAnalyses.has(groupKey)) {
        groupedAnalyses.set(groupKey, [])
      }
      groupedAnalyses.get(groupKey)!.push(analysis)
    })

    // Pour chaque groupe, ne garder que la version la plus récente (highest versionNumber)
    filtered = Array.from(groupedAnalyses.values()).map((versions) => {
      // Trier par numéro de version (décroissant)
      versions.sort((a, b) => (b.versionNumber || 1) - (a.versionNumber || 1))
      // Retourner la version la plus récente
      return versions[0]
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

    // Fonction pour extraire toutes les propriétés d'un champ (pour objets et listes d'objets)
    const extractFieldProperties = (field: any): string[] => {
      if (!field || !field.valeur) return []
      
      const value = field.valeur
      
      // Si c'est un tableau d'objets
      if (Array.isArray(value) && value.length > 0) {
        const firstItem = value[0]
        if (typeof firstItem === "object" && firstItem !== null) {
          return Object.keys(firstItem)
        }
      }
      
      // Si c'est un objet simple
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        return Object.keys(value)
      }
      
      return []
    }

    // Collecter tous les noms de champs personnalisés et leurs propriétés
    const customFieldMap = new Map<string, string[]>() // fieldName -> [property1, property2, ...]
    
    filteredAnalyses.forEach((analysis) => {
      const customFields = analysis.analysisResult?.extractedData?.customFields
      if (customFields) {
        Object.entries(customFields).forEach(([fieldName, fieldData]: [string, any]) => {
          const properties = extractFieldProperties(fieldData)
          
          // Si le champ existe déjà, fusionner les propriétés
          if (customFieldMap.has(fieldName)) {
            const existingProps = customFieldMap.get(fieldName) || []
            const allProps = [...new Set([...existingProps, ...properties])]
            customFieldMap.set(fieldName, allProps)
          } else {
            customFieldMap.set(fieldName, properties)
          }
        })
      }
    })

    // Créer les en-têtes : colonnes de base + colonnes dynamiques
    const baseHeaders = [
      "Titre",
      "Client",
      "Fichier",
      "Statut",
      "Validé",
      "Pièces/Barre",
      "Coût/Pièce",
      "Date de création",
    ]
    
    // Créer les colonnes pour les champs personnalisés
    const customHeaders: string[] = []
    const sortedFieldNames = Array.from(customFieldMap.keys()).sort()
    
    sortedFieldNames.forEach((fieldName) => {
      const properties = customFieldMap.get(fieldName) || []
      
      if (properties.length > 0) {
        // C'est un objet ou une liste d'objets : créer une colonne par propriété
        properties.forEach((prop) => {
          customHeaders.push(`${fieldName}_${prop}`)
        })
      } else {
        // C'est un champ simple : une seule colonne
        customHeaders.push(fieldName)
      }
    })
    
    const headers = [...baseHeaders, ...customHeaders]

    // Fonction pour formater une valeur de champ personnalisé
    const formatCustomFieldValue = (field: any, fieldName: string, propertyName?: string): string => {
      if (!field) return ""
      
      const value = field.valeur
      if (value === null || value === undefined || value === "") return ""
      
      // Si une propriété spécifique est demandée (pour objets/listes d'objets)
      if (propertyName) {
        // Si c'est un tableau d'objets
        if (Array.isArray(value) && value.length > 0) {
          // Concaténer les valeurs de cette propriété pour tous les éléments
          const values = value
            .map((item: any) => {
              if (typeof item === "object" && item !== null && propertyName in item) {
                return String(item[propertyName])
              }
              return ""
            })
            .filter((v: string) => v !== "")
          
          return values.length > 0 ? values.join("; ") : ""
        }
        
        // Si c'est un objet simple
        if (typeof value === "object" && value !== null && !Array.isArray(value) && propertyName in value) {
          return String(value[propertyName])
        }
        
        return ""
      }
      
      // Pas de propriété spécifique : valeur simple
      // Si c'est un objet ou un tableau, on ne devrait pas arriver ici normalement
      // mais on gère le cas pour la compatibilité
      if (typeof value === "object") {
        // Pour les objets simples sans propriété spécifique, sérialiser
        try {
          return JSON.stringify(value)
        } catch {
          return String(value)
        }
      }
      
      return String(value)
    }

    // Créer les lignes avec les valeurs
    const rows = filteredAnalyses.map((analysis) => {
      const customFields = analysis.analysisResult?.extractedData?.customFields || {}
      
      // Colonnes de base
      const baseRow = [
        analysis.title,
        analysis.clientName || "",
        analysis.fileName,
        analysis.status,
        analysis.validated ? "Oui" : "Non",
        analysis.calculationResult?.piecesPerBar?.toString() || "",
        analysis.calculationResult?.estimatedCost?.toString() || "",
        new Date(analysis.createdAt).toLocaleDateString(),
      ]
      
      // Colonnes des champs personnalisés (dans le même ordre que les en-têtes)
      const customRow: string[] = []
      
      sortedFieldNames.forEach((fieldName) => {
        const field = customFields[fieldName]
        const properties = customFieldMap.get(fieldName) || []
        
        if (properties.length > 0) {
          // C'est un objet ou une liste d'objets : une colonne par propriété
          properties.forEach((prop) => {
            customRow.push(formatCustomFieldValue(field, fieldName, prop))
          })
        } else {
          // C'est un champ simple : une seule colonne
          customRow.push(formatCustomFieldValue(field, fieldName))
        }
      })
      
      return [...baseRow, ...customRow]
    })

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n")

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
            filteredAnalyses.map((analysis) => {
              const versions = getVersions(analysis)
              const isExpanded = expandedAnalysis === (analysis.parentId || analysis.id)
              const hasMultipleVersions = versions.length > 1

              return (
                <Card key={analysis.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        {/* Titre et statut */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-gray-900">{analysis.title || "Analyse sans titre"}</h3>
                              {hasMultipleVersions && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleVersions(analysis.parentId || analysis.id)}
                                  className="h-6 px-2"
                                >
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  <History className="h-3 w-3 ml-1" />
                                  <span className="text-xs ml-1">{versions.length} versions</span>
                                </Button>
                              )}
                            </div>
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
                          {analysis.versionNumber && (
                            <Badge className="bg-purple-100 text-purple-800">
                              V{analysis.versionNumber}
                            </Badge>
                          )}
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

                  {/* Liste des versions si expanded */}
                  {isExpanded && hasMultipleVersions && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="text-sm font-semibold mb-3 text-gray-700">Historique des versions</h4>
                      <div className="space-y-2">
                        {versions.map((version) => (
                          <div
                            key={version.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <Badge className="bg-purple-100 text-purple-800 font-mono">
                                V{version.versionNumber || 1}
                              </Badge>
                              <Badge className={getStatusColor(version.status)} variant="outline">
                                {getStatusLabel(version.status)}
                              </Badge>
                              {version.validated && (
                                <Badge className="bg-green-100 text-green-800" variant="outline">
                                  ✓ Validé
                                </Badge>
                              )}
                              {version.currentStep && (
                                <span className="text-xs text-gray-600">
                                  Étape {version.currentStep}/4
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                {new Date(version.updatedAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Link href={`/?load=${version.id}`}>
                                <Button variant="outline" size="sm">
                                  {version.currentStep && version.currentStep < 4 ? "Continuer" : "Voir"}
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAnalysis(version.id)}
                              >
                                <Trash2 className="h-3 w-3 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
