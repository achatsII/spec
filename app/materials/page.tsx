"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2, Search, Download, Upload, Package } from "lucide-react"
import type { RawMaterial } from "@/types/analysis"
import RawMaterialModal from "@/components/raw-material-modal"
import Link from "next/link"

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<RawMaterial[]>([])
  const [filteredMaterials, setFilteredMaterials] = useState<RawMaterial[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [materialFilter, setMaterialFilter] = useState<string>("all")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadMaterials()
  }, [])

  useEffect(() => {
    filterMaterials()
  }, [searchQuery, categoryFilter, materialFilter, materials])

  const loadMaterials = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/raw-materials")
      const data = await response.json()

      if (data.success && Array.isArray(data.materials)) {
        setMaterials(data.materials)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des matières premières:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterMaterials = () => {
    let filtered = [...materials]

    // Filtre par recherche
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (material) =>
          material.name.toLowerCase().includes(query) ||
          material.category?.toLowerCase().includes(query) ||
          material.material?.toLowerCase().includes(query) ||
          material.dimensions?.toLowerCase().includes(query)
      )
    }

    // Filtre par catégorie
    if (categoryFilter !== "all") {
      filtered = filtered.filter((material) => material.category === categoryFilter)
    }

    // Filtre par matériau
    if (materialFilter !== "all") {
      filtered = filtered.filter((material) => material.material === materialFilter)
    }

    setFilteredMaterials(filtered)
  }

  const handleMaterialSave = async (material: RawMaterial) => {
    try {
      const method = editingMaterial ? "PUT" : "POST"
      const url = editingMaterial ? `/api/raw-materials/${material.id}` : "/api/raw-materials"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(material),
      })

      const data = await response.json()

      if (data.success) {
        await loadMaterials()
        setIsModalOpen(false)
        setEditingMaterial(null)
      } else {
        alert("Erreur lors de la sauvegarde: " + (data.error || "Erreur inconnue"))
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error)
      alert("Erreur lors de la sauvegarde de la matière première")
    }
  }

  const handleMaterialDelete = async (materialId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette matière première ?")) {
      return
    }

    try {
      const response = await fetch(`/api/raw-materials/${materialId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        await loadMaterials()
      } else {
        alert("Erreur lors de la suppression: " + (data.error || "Erreur inconnue"))
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error)
      alert("Erreur lors de la suppression de la matière première")
    }
  }

  const exportToCSV = () => {
    if (filteredMaterials.length === 0) {
      alert("Aucune matière première à exporter")
      return
    }

    const headers = [
      "Nom",
      "Catégorie",
      "Matériau",
      "Dimensions",
      "Longueur standard",
      "Unité",
      "Coût par unité",
      "Fournisseur",
      "Référence",
      "Notes",
    ]

    const rows = filteredMaterials.map((material) => [
      material.name,
      material.category || "",
      material.material || "",
      material.dimensions || "",
      material.standardLength?.toString() || "",
      material.unit || "",
      material.costPerUnit?.toString() || "",
      material.supplier || "",
      material.reference || "",
      material.notes || "",
    ])

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `matieres_premieres_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
  }

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split("\n")

        const importedMaterials: Partial<RawMaterial>[] = []

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue

          const values = line.split(",").map((v) => v.replace(/"/g, "").trim())

          if (values.length >= 1 && values[0]) {
            importedMaterials.push({
              name: values[0],
              category: values[1] || "",
              material: values[2] || "",
              dimensions: values[3] || "",
              standardLength: parseFloat(values[4]) || 0,
              unit: values[5] || "pouces",
              costPerUnit: parseFloat(values[6]) || 0,
              supplier: values[7] || "",
              reference: values[8] || "",
              notes: values[9] || "",
            })
          }
        }

        // Importer les matières premières une par une
        for (const materialData of importedMaterials) {
          const material: RawMaterial = {
            id: `material_${Date.now()}_${Math.random()}`,
            name: materialData.name || "Matière importée",
            category: materialData.category || "",
            material: materialData.material || "",
            dimensions: materialData.dimensions || "",
            standardLength: materialData.standardLength || 0,
            unit: materialData.unit || "pouces",
            costPerUnit: materialData.costPerUnit || 0,
            supplier: materialData.supplier || "",
            reference: materialData.reference || "",
            notes: materialData.notes || "",
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          await fetch("/api/raw-materials", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(material),
          })
        }

        alert(`${importedMaterials.length} matières premières importées avec succès`)
        await loadMaterials()
      } catch (error) {
        console.error("Erreur lors de l'import:", error)
        alert("Erreur lors de l'import du fichier CSV")
      }
    }
    reader.readAsText(file)
  }

  // Get unique categories and materials for filters
  const categories = Array.from(new Set(materials.map((m) => m.category).filter(Boolean)))
  const materialTypes = Array.from(new Set(materials.map((m) => m.material).filter(Boolean)))

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Package className="h-8 w-8 text-[#0078FF]" />
                Matières Premières
              </h1>
              <p className="text-gray-600 mt-2">
                {filteredMaterials.length} matière{filteredMaterials.length !== 1 ? "s" : ""} trouvée
                {filteredMaterials.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Link href="/">
              <Button variant="outline">Retour à l'analyse</Button>
            </Link>
          </div>
        </div>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={() => {
                  setEditingMaterial(null)
                  setIsModalOpen(true)
                }}
                className="bg-[#0078FF] hover:bg-[#0078FF]/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle matière première
              </Button>

              <Button onClick={exportToCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exporter CSV
              </Button>

              <Button variant="outline" onClick={() => document.getElementById("import-csv")?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Importer CSV
              </Button>
              <input id="import-csv" type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
            </div>
          </CardContent>
        </Card>

        {/* Filtres et Recherche */}
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
                placeholder="Rechercher par nom, catégorie, matériau..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtres */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Catégorie</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les catégories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Matériau</label>
                <Select value={materialFilter} onValueChange={setMaterialFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les matériaux</SelectItem>
                    {materialTypes.map((material) => (
                      <SelectItem key={material} value={material}>
                        {material}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des matières premières */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center text-gray-500">Chargement...</CardContent>
            </Card>
          ) : filteredMaterials.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center text-gray-500">
                {searchQuery || categoryFilter !== "all" || materialFilter !== "all"
                  ? "Aucune matière première trouvée avec ces critères"
                  : "Aucune matière première enregistrée"}
              </CardContent>
            </Card>
          ) : (
            filteredMaterials.map((material) => (
              <Card key={material.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="truncate flex-1">{material.name}</span>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingMaterial(material)
                          setIsModalOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMaterialDelete(material.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex gap-2">
                    {material.category && <Badge variant="outline">{material.category}</Badge>}
                    {material.material && <Badge variant="secondary">{material.material}</Badge>}
                  </div>

                  {material.dimensions && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Dimensions:</span> {material.dimensions}
                    </p>
                  )}

                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Longueur:</span> {material.standardLength} {material.unit}
                  </p>

                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Coût:</span> ${material.costPerUnit.toFixed(2)} / unité
                  </p>

                  {material.supplier && (
                    <p className="text-xs text-gray-500">
                      <span className="font-medium">Fournisseur:</span> {material.supplier}
                    </p>
                  )}

                  {material.reference && (
                    <p className="text-xs text-gray-500">
                      <span className="font-medium">Réf:</span> {material.reference}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <RawMaterialModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingMaterial(null)
        }}
        material={editingMaterial}
        onSave={handleMaterialSave}
      />
    </div>
  )
}
