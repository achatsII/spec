"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, Save } from "lucide-react"
import type { ExtractionProfile, ExtractableField, CustomFormula } from "@/types/analysis"

interface ExtractionProfileModalProps {
  isOpen: boolean
  onClose: () => void
  profile: ExtractionProfile | null
  onSave: (profile: ExtractionProfile) => void
}

export default function ExtractionProfileModal({ isOpen, onClose, profile, onSave }: ExtractionProfileModalProps) {
  const [formData, setFormData] = useState<Partial<ExtractionProfile>>({
    name: "",
    description: "",
    customFields: [],
    formulas: [],
    compatibleMaterialIds: [],
  })

  useEffect(() => {
    if (profile) {
      setFormData(profile)
    } else {
      setFormData({
        name: "",
        description: "",
        customFields: [],
        formulas: [],
        compatibleMaterialIds: [],
      })
    }
  }, [profile, isOpen])

  const handleSubmit = () => {
    if (!formData.name?.trim()) {
      alert("Le nom du profil est obligatoire")
      return
    }

    const profileData: ExtractionProfile = {
      id: profile?.id || `profile_${Date.now()}`,
      name: formData.name,
      description: formData.description || "",
      customFields: formData.customFields || [],
      formulas: formData.formulas || [],
      compatibleMaterialIds: formData.compatibleMaterialIds || [],
      createdAt: profile?.createdAt || new Date(),
      updatedAt: new Date(),
    }

    onSave(profileData)
  }

  // ===== GESTION DES CHAMPS EXTRACTIBLES =====
  const addCustomField = () => {
    const newField: ExtractableField = {
      id: `field_${Date.now()}`,
      name: "",
      label: "",
      type: "simple",
      required: false,
      prompt: "",
    }
    setFormData({
      ...formData,
      customFields: [...(formData.customFields || []), newField],
    })
  }

  const updateCustomField = (index: number, field: ExtractableField) => {
    const updated = [...(formData.customFields || [])]
    updated[index] = field
    setFormData({ ...formData, customFields: updated })
  }

  const removeCustomField = (index: number) => {
    const updated = [...(formData.customFields || [])]
    updated.splice(index, 1)
    setFormData({ ...formData, customFields: updated })
  }

  // ===== GESTION DES FORMULES =====
  const addFormula = () => {
    const newFormula: CustomFormula = {
      id: `formula_${Date.now()}`,
      name: "",
      description: "",
      category: "other",
      formula: "",
      variables: [],
    }
    setFormData({
      ...formData,
      formulas: [...(formData.formulas || []), newFormula],
    })
  }

  const updateFormula = (index: number, formula: CustomFormula) => {
    const updated = [...(formData.formulas || [])]
    updated[index] = formula
    setFormData({ ...formData, formulas: updated })
  }

  const removeFormula = (index: number) => {
    const updated = [...(formData.formulas || [])]
    updated.splice(index, 1)
    setFormData({ ...formData, formulas: updated })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{profile ? "Modifier le profil d'extraction" : "Nouveau profil d'extraction"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations de base */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Nom du profil <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Analyse complète pièces métalliques"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description du profil d'extraction..."
                rows={2}
              />
            </div>
          </div>

          {/* Tabs pour organiser */}
          <Tabs defaultValue="fields" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="fields">Champs extractibles ({formData.customFields?.length || 0})</TabsTrigger>
              <TabsTrigger value="formulas">Formules de calcul ({formData.formulas?.length || 0})</TabsTrigger>
            </TabsList>

            {/* TAB: Champs extractibles */}
            <TabsContent value="fields" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Définissez les champs que l'IA doit extraire en plus des champs standards
                </p>
                <Button onClick={addCustomField} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un champ
                </Button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {formData.customFields && formData.customFields.length > 0 ? (
                  formData.customFields.map((field, index) => (
                    <Card key={field.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">Champ #{index + 1}</CardTitle>
                          <Button variant="ghost" size="sm" onClick={() => removeCustomField(index)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Nom technique</Label>
                            <Input
                              value={field.name}
                              onChange={(e) =>
                                updateCustomField(index, { ...field, name: e.target.value })
                              }
                              placeholder="trous"
                              className="text-sm"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Label d'affichage</Label>
                            <Input
                              value={field.label}
                              onChange={(e) =>
                                updateCustomField(index, { ...field, label: e.target.value })
                              }
                              placeholder="Trous"
                              className="text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Type de champ</Label>
                            <Select
                              value={field.type}
                              onValueChange={(value: any) =>
                                updateCustomField(index, { ...field, type: value })
                              }
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="simple">Simple (texte/nombre)</SelectItem>
                                <SelectItem value="complex">Complexe (structure)</SelectItem>
                                <SelectItem value="dimension">Dimension</SelectItem>
                                <SelectItem value="array">Liste/Array</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center gap-4 pt-6">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) =>
                                  updateCustomField(index, { ...field, required: e.target.checked })
                                }
                              />
                              Obligatoire
                            </label>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Instruction pour l'IA</Label>
                          <Textarea
                            value={field.prompt}
                            onChange={(e) =>
                              updateCustomField(index, { ...field, prompt: e.target.value })
                            }
                            placeholder="Ex: Extraire TOUS les trous avec leur quantité, dimension et type (taraudé, percé, etc.)"
                            rows={2}
                            className="text-sm"
                          />
                        </div>

                        {field.type === "complex" && (
                          <div className="bg-blue-50 p-3 rounded text-xs text-blue-800">
                            💡 Pour les champs complexes, l'IA retournera un objet structuré (ex: quantité: 8,
                            dimension: "M8", type: "fileté")
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    Aucun champ personnalisé défini. Cliquez sur "Ajouter un champ" pour commencer.
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB: Formules */}
            <TabsContent value="formulas" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Créez des formules pour calculer automatiquement des valeurs (temps, coûts, quantités)
                </p>
                <Button onClick={addFormula} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une formule
                </Button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {formData.formulas && formData.formulas.length > 0 ? (
                  formData.formulas.map((formula, index) => (
                    <Card key={formula.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-sm">Formule #{index + 1}</CardTitle>
                            <Badge variant="outline">{formula.category}</Badge>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removeFormula(index)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Nom de la formule</Label>
                            <Input
                              value={formula.name}
                              onChange={(e) =>
                                updateFormula(index, { ...formula, name: e.target.value })
                              }
                              placeholder="Temps de perçage"
                              className="text-sm"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Catégorie</Label>
                            <Select
                              value={formula.category}
                              onValueChange={(value: any) =>
                                updateFormula(index, { ...formula, category: value })
                              }
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="time">Temps</SelectItem>
                                <SelectItem value="cost">Coût</SelectItem>
                                <SelectItem value="quantity">Quantité</SelectItem>
                                <SelectItem value="optimization">Optimisation</SelectItem>
                                <SelectItem value="other">Autre</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Description</Label>
                          <Input
                            value={formula.description}
                            onChange={(e) =>
                              updateFormula(index, { ...formula, description: e.target.value })
                            }
                            placeholder="Calcule le temps total de perçage"
                            className="text-sm"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Formule (syntaxe mathjs)</Label>
                          <Textarea
                            value={formula.formula}
                            onChange={(e) =>
                              updateFormula(index, { ...formula, formula: e.target.value })
                            }
                            placeholder="trous.quantite * 2.5"
                            rows={2}
                            className="text-sm font-mono"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Unité du résultat</Label>
                            <Input
                              value={formula.unit}
                              onChange={(e) =>
                                updateFormula(index, { ...formula, unit: e.target.value })
                              }
                              placeholder="minutes"
                              className="text-sm"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Variables utilisées (séparées par virgules)</Label>
                            <Input
                              value={formula.variables.join(", ")}
                              onChange={(e) =>
                                updateFormula(index, {
                                  ...formula,
                                  variables: e.target.value.split(",").map((v) => v.trim()),
                                })
                              }
                              placeholder="trous.quantite, longueur"
                              className="text-sm"
                            />
                          </div>
                        </div>

                        <div className="bg-green-50 p-2 rounded text-xs text-green-800">
                          💡 Utilisez les noms des champs extraits comme variables (ex: trous.quantite, longueur,
                          largeur)
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    Aucune formule définie. Cliquez sur "Ajouter une formule" pour commencer.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Boutons d'action */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} className="bg-[#0078FF] hover:bg-[#0078FF]/90">
              <Save className="h-4 w-4 mr-2" />
              {profile ? "Mettre à jour" : "Créer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
