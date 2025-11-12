"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { RawMaterial } from "@/types/analysis"

interface RawMaterialModalProps {
  isOpen: boolean
  onClose: () => void
  material: RawMaterial | null
  onSave: (material: RawMaterial) => void
}

export default function RawMaterialModal({ isOpen, onClose, material, onSave }: RawMaterialModalProps) {
  const [formData, setFormData] = useState<Partial<RawMaterial>>({
    name: "",
    category: "",
    material: "",
    dimensions: "",
    standardLength: 0,
    unit: "pouces",
    costPerUnit: 0,
    supplier: "",
    reference: "",
    notes: "",
  })

  useEffect(() => {
    if (material) {
      setFormData(material)
    } else {
      setFormData({
        name: "",
        category: "",
        material: "",
        dimensions: "",
        standardLength: 0,
        unit: "pouces",
        costPerUnit: 0,
        supplier: "",
        reference: "",
        notes: "",
      })
    }
  }, [material, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name?.trim()) {
      alert("Le nom de la matière première est obligatoire")
      return
    }

    const materialData: RawMaterial = {
      id: material?.id || `material_${Date.now()}`,
      name: formData.name,
      category: formData.category || "",
      material: formData.material || "",
      dimensions: formData.dimensions || "",
      standardLength: formData.standardLength || 0,
      unit: formData.unit || "pouces",
      costPerUnit: formData.costPerUnit || 0,
      supplier: formData.supplier || "",
      reference: formData.reference || "",
      notes: formData.notes || "",
      createdAt: material?.createdAt || new Date(),
      updatedAt: new Date(),
    }

    onSave(materialData)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{material ? "Modifier la matière première" : "Nouvelle matière première"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Nom <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Tube carré acier 1.5x1.5x0.1"
              required
            />
          </div>

          {/* Catégorie et Matériau */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tube">Tube</SelectItem>
                  <SelectItem value="Plat">Plat</SelectItem>
                  <SelectItem value="Cornière">Cornière</SelectItem>
                  <SelectItem value="Plaque">Plaque</SelectItem>
                  <SelectItem value="Rond">Rond</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="material">Matériau</Label>
              <Select
                value={formData.material}
                onValueChange={(value) => setFormData({ ...formData, material: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un matériau" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Acier">Acier</SelectItem>
                  <SelectItem value="Aluminium">Aluminium</SelectItem>
                  <SelectItem value="Inox">Inox</SelectItem>
                  <SelectItem value="Laiton">Laiton</SelectItem>
                  <SelectItem value="Cuivre">Cuivre</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dimensions */}
          <div className="space-y-2">
            <Label htmlFor="dimensions">Dimensions</Label>
            <Input
              id="dimensions"
              value={formData.dimensions}
              onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
              placeholder="Ex: 1.5x1.5x0.1 ou 2x4"
            />
          </div>

          {/* Longueur standard et Unité */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="standardLength">Longueur standard</Label>
              <Input
                id="standardLength"
                type="number"
                step="0.01"
                value={formData.standardLength}
                onChange={(e) => setFormData({ ...formData, standardLength: parseFloat(e.target.value) || 0 })}
                placeholder="288"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unité</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pouces">Pouces</SelectItem>
                  <SelectItem value="mm">Millimètres (mm)</SelectItem>
                  <SelectItem value="cm">Centimètres (cm)</SelectItem>
                  <SelectItem value="m">Mètres (m)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Coût */}
          <div className="space-y-2">
            <Label htmlFor="costPerUnit">Coût par unité ($)</Label>
            <Input
              id="costPerUnit"
              type="number"
              step="0.01"
              value={formData.costPerUnit}
              onChange={(e) => setFormData({ ...formData, costPerUnit: parseFloat(e.target.value) || 0 })}
              placeholder="45.50"
            />
          </div>

          {/* Fournisseur et Référence */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Fournisseur</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Ex: ACME Supply"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Référence</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="Ex: REF-12345"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes additionnelles..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" className="bg-[#0078FF] hover:bg-[#0078FF]/90">
              {material ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
