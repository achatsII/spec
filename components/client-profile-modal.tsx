"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2 } from "lucide-react"
import type { ClientProfile, Material, Formula } from "@/types/analysis"

interface ClientProfileModalProps {
  isOpen: boolean
  onClose: () => void
  profile: ClientProfile | null
  onSave: (profile: ClientProfile) => void
}

const createEmptyMaterial = (): Material => ({
  id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
  type: "",
  dimensions: "",
  standardLength: 0,
  unit: "mm",
  costPerUnit: 0,
})

const createEmptyFormula = (): Formula => ({
  id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
  name: "",
  condition: "",
  formula: "",
  description: "",
})

export default function ClientProfileModal({ isOpen, onClose, profile, onSave }: ClientProfileModalProps) {
  const [formData, setFormData] = useState<ClientProfile>({
    id: "",
    name: "",
    materials: [],
    formulas: [],
  })

  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (profile) {
        console.log("Chargement du profil pour édition:", profile)
        // Créer une copie profonde pour éviter les mutations
        setFormData({
          ...profile,
          materials: profile.materials ? [...profile.materials] : [],
          formulas: profile.formulas ? [...profile.formulas] : [],
        })
      } else {
        console.log("Création d'un nouveau profil")
        setFormData({
          id: Date.now().toString(),
          name: "",
          materials: [],
          formulas: [],
        })
      }
    }
  }, [profile, isOpen])

  const addMaterial = () => {
    const newMaterial = createEmptyMaterial()
    setFormData((prev) => ({
      ...prev,
      materials: [...prev.materials, newMaterial],
    }))
  }

  const updateMaterial = (index: number, field: keyof Material, value: any) => {
    setFormData((prev) => ({
      ...prev,
      materials: prev.materials.map((material, i) => (i === index ? { ...material, [field]: value } : material)),
    }))
  }

  const removeMaterial = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index),
    }))
  }

  const addFormula = () => {
    const newFormula = createEmptyFormula()
    setFormData((prev) => ({
      ...prev,
      formulas: [...prev.formulas, newFormula],
    }))
  }

  const updateFormula = (index: number, field: keyof Formula, value: string) => {
    setFormData((prev) => ({
      ...prev,
      formulas: prev.formulas.map((formula, i) => (i === index ? { ...formula, [field]: value } : formula)),
    }))
  }

  const removeFormula = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      formulas: prev.formulas.filter((_, i) => i !== index),
    }))
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert("Le nom du profil est obligatoire")
      return
    }

    setIsSaving(true)
    try {
      console.log("Sauvegarde du profil:", formData)
      await onSave(formData)
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    if (!isSaving) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{profile ? "Modifier le profil client" : "Nouveau profil client"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div>
            <Label htmlFor="name">Nom du profil *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: ACME Manufacturing"
              disabled={isSaving}
            />
          </div>

          {/* Materials */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Matériaux disponibles</h3>
              <Button onClick={addMaterial} size="sm" disabled={isSaving}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </div>

            <div className="space-y-4">
              {formData.materials.map((material, index) => (
                <div key={material.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Matériau {index + 1}</h4>
                    <Button variant="ghost" size="sm" onClick={() => removeMaterial(index)} disabled={isSaving}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Type</Label>
                      <Input
                        value={material.type}
                        onChange={(e) => updateMaterial(index, "type", e.target.value)}
                        placeholder="Ex: Tube carré acier"
                        disabled={isSaving}
                      />
                    </div>
                    <div>
                      <Label>Dimensions</Label>
                      <Input
                        value={material.dimensions}
                        onChange={(e) => updateMaterial(index, "dimensions", e.target.value)}
                        placeholder="Ex: 1.5x1.5x0.1"
                        disabled={isSaving}
                      />
                    </div>
                    <div>
                      <Label>Longueur standard</Label>
                      <Input
                        type="number"
                        value={material.standardLength}
                        onChange={(e) =>
                          updateMaterial(index, "standardLength", Number.parseFloat(e.target.value) || 0)
                        }
                        placeholder="288"
                        disabled={isSaving}
                      />
                    </div>
                    <div>
                      <Label>Unité</Label>
                      <Input
                        value={material.unit}
                        onChange={(e) => updateMaterial(index, "unit", e.target.value)}
                        placeholder="mm, pouces"
                        disabled={isSaving}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Coût par unité</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={material.costPerUnit}
                        onChange={(e) => updateMaterial(index, "costPerUnit", Number.parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {formData.materials.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Aucun matériau configuré. Cliquez sur "Ajouter" pour commencer.
                </div>
              )}
            </div>
          </div>

          {/* Formulas */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Formules de calcul</h3>
              <Button onClick={addFormula} size="sm" disabled={isSaving}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </div>

            <div className="space-y-4">
              {formData.formulas.map((formula, index) => (
                <div key={formula.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Formule {index + 1}</h4>
                    <Button variant="ghost" size="sm" onClick={() => removeFormula(index)} disabled={isSaving}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <Label>Nom</Label>
                      <Input
                        value={formula.name}
                        onChange={(e) => updateFormula(index, "name", e.target.value)}
                        placeholder="Ex: Calcul découpe laser"
                        disabled={isSaving}
                      />
                    </div>
                    <div>
                      <Label>Condition</Label>
                      <Input
                        value={formula.condition}
                        onChange={(e) => updateFormula(index, "condition", e.target.value)}
                        placeholder="Ex: type_piece == 'tube' && procede == 'decoupe laser'"
                        disabled={isSaving}
                      />
                    </div>
                    <div>
                      <Label>Formule</Label>
                      <Textarea
                        value={formula.formula}
                        onChange={(e) => updateFormula(index, "formula", e.target.value)}
                        placeholder="Ex: floor((longueur_barre - 12) / (longueur_piece + 0.25))"
                        rows={3}
                        disabled={isSaving}
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={formula.description}
                        onChange={(e) => updateFormula(index, "description", e.target.value)}
                        placeholder="Description de la formule"
                        rows={2}
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {formData.formulas.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Aucune formule configurée. Le calcul par défaut sera utilisé.
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={isSaving}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={!formData.name.trim() || isSaving}>
              {isSaving ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
