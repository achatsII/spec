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
import { normalizePropertyName } from "@/lib/normalize-property-name"

interface ExtractionProfileModalProps {
  isOpen: boolean
  onClose: () => void
  profile: ExtractionProfile | null
  onSave: (profile: ExtractionProfile) => void
}

export default function ExtractionProfileModal({ isOpen, onClose, profile, onSave }: ExtractionProfileModalProps) {
  const [formData, setFormData] = useState<Partial<ExtractionProfile>>({
    name: "",
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
      instruction: "",
    }
    setFormData({
      ...formData,
      customFields: [...(formData.customFields || []), newField],
    })
  }

  // Fonction pour générer automatiquement un label à partir du nom technique
  const generateLabel = (name: string): string => {
    if (!name) return ""

    // Remplacer les underscores et tirets par des espaces
    const words = name.replace(/[_-]/g, " ").split(" ")

    // Capitaliser chaque mot
    const capitalizedWords = words.map(word => {
      if (!word) return ""
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })

    return capitalizedWords.join(" ")
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
  // Fonction pour extraire les variables d'une formule et les classer
  const extractVariablesFromFormula = (formula: string): { valid: string[]; unknown: string[] } => {
    if (!formula || !formula.trim()) return { valid: [], unknown: [] }
    
    // Liste des noms de champs disponibles pour validation
    const availableFields = (formData.customFields || []).map(f => f.name)
    
    // Séparer la formule par les opérateurs mathématiques et autres caractères
    // On garde les identifiants valides (lettres, chiffres, underscores, points)
    const tokens = formula
      .split(/[\s+\-*/()=<>!&|,;]+/) // Séparer par opérateurs et caractères spéciaux
      .map(t => t.trim())
      .filter(t => t.length > 0)
      .filter(t => !/^\d+\.?\d*$/.test(t)) // Exclure les nombres purs
      .filter(t => !['if', 'then', 'else', 'and', 'or', 'not', 'abs', 'sqrt', 'pow', 'min', 'max', 'sum', 'avg'].includes(t.toLowerCase())) // Exclure les fonctions mathématiques communes
    
    // Extraire les variables valides et inconnues
    const validVariables = new Set<string>()
    const unknownVariables = new Set<string>()
    
    tokens.forEach(token => {
      // Vérifier si c'est un nom de champ direct
      if (availableFields.includes(token)) {
        validVariables.add(token)
      }
      // Vérifier si c'est un champ avec propriété (ex: trous.quantite)
      else if (token.includes('.')) {
        const [fieldName] = token.split('.')
        if (availableFields.includes(fieldName)) {
          validVariables.add(token) // Garder le nom complet avec la propriété
        } else if (/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(token)) {
          // Variable avec point mais champ non reconnu
          unknownVariables.add(token)
        }
      }
      // Vérifier si c'est une variable qui ressemble à un nom de champ (lettres, underscores, points)
      else if (/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(token)) {
        // Si ça commence par un nom de champ connu, c'est probablement une variable valide
        const possibleField = availableFields.find(f => token.startsWith(f))
        if (possibleField) {
          validVariables.add(token)
        } else if (availableFields.length === 0) {
          // Si aucun champ n'est défini, on accepte tout ce qui ressemble à une variable comme valide
          validVariables.add(token)
        } else {
          // Variable inconnue
          unknownVariables.add(token)
        }
      }
    })
    
    return {
      valid: Array.from(validVariables).sort(),
      unknown: Array.from(unknownVariables).sort()
    }
  }

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
    // Extraire automatiquement les variables de la formule
    const { valid, unknown } = extractVariablesFromFormula(formula.formula)
    // Stocker toutes les variables (valides et inconnues) pour l'affichage
    const allVariables = [...valid, ...unknown]
    const updatedFormula = {
      ...formula,
      variables: allVariables, // Stocker toutes les variables pour l'affichage
    }
    
    const updated = [...(formData.formulas || [])]
    updated[index] = updatedFormula
    setFormData({ ...formData, formulas: updated })
  }
  
  // Fonction helper pour obtenir les variables valides et inconnues d'une formule
  const getFormulaVariables = (formula: CustomFormula) => {
    return extractVariablesFromFormula(formula.formula)
  }

  const removeFormula = (index: number) => {
    const updated = [...(formData.formulas || [])]
    updated.splice(index, 1)
    setFormData({ ...formData, formulas: updated })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
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
                placeholder="Ex: Détaillé"
              />
              <p className="text-xs text-gray-500">
                Le profil génère automatiquement un prompt avec le format: &quot;Analyse le document technique. Extrais les informations suivantes: [détails des champs] + Réponds en JSON: un tableau d&apos;objets avec clés name, data_type, value, confidence (0-100), et justification&quot;
              </p>
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Nom technique</Label>
                            <Input
                              value={field.name}
                              onChange={(e) => {
                                const newName = e.target.value
                                // Générer automatiquement le label si celui-ci est vide ou correspond au label auto-généré de l'ancien nom
                                const autoLabel = generateLabel(field.name)
                                const shouldUpdateLabel = !field.label || field.label === autoLabel

                                updateCustomField(index, {
                                  ...field,
                                  name: newName,
                                  label: shouldUpdateLabel ? generateLabel(newName) : field.label
                                })
                              }}
                              placeholder="trous_dimension"
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
                              placeholder="Trous Dimension"
                              className="text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                <SelectItem value="objet">Objet (structure unique)</SelectItem>
                                <SelectItem value="liste_objets">Liste d'objets (tableau)</SelectItem>
                                <SelectItem value="dimension">Dimension (avec unité)</SelectItem>
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
                            value={field.instruction}
                            onChange={(e) =>
                              updateCustomField(index, { ...field, instruction: e.target.value })
                            }
                            placeholder="Ex: Identifier tous les trous par type (taraudé, percé, etc.) avec leur quantité, diamètre et position"
                            rows={2}
                            className="text-sm"
                          />
                        </div>

                        {(field.type === "objet" || field.type === "liste_objets") && (
                          <div className="space-y-2">
                            <Label className="text-xs">Propriétés de l'objet (séparées par virgules)</Label>
                            <Textarea
                              value={field.structure?.properties?.join(", ") || ""}
                              onChange={(e) => {
                                const rawValue = e.target.value

                                // Split par virgule, normaliser les noms de propriétés (enlever accents)
                                const properties = rawValue
                                  .split(",")
                                  .map(prop => {
                                    const trimmed = prop.trim()
                                    // Normaliser seulement si non vide
                                    return trimmed ? normalizePropertyName(trimmed) : ""
                                  })

                                updateCustomField(index, {
                                  ...field,
                                  structure: {
                                    properties: properties,
                                  },
                                })
                              }}
                              placeholder="type, quantite, diametre, position"
                              rows={2}
                              className="text-sm"
                            />
                            <div className="bg-blue-50 p-3 rounded text-xs text-blue-800">
                              💡 {field.type === "objet"
                                ? "L'IA retournera un objet avec ces propriétés normalisées (ex: {type: 'taraude', quantite: 8, diametre: 'M8'})"
                                : "L'IA retournera un tableau d'objets avec ces propriétés normalisées"}
                              <br />
                              <span className="text-blue-600">⚡ Les accents sont automatiquement supprimés pour éviter les problèmes d'encodage</span>
                            </div>
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
                <div>
                  <p className="text-sm text-gray-600">
                    Créez des formules pour calculer automatiquement des valeurs (temps, coûts, quantités)
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    💡 <strong>Temps d'opération :</strong> Créez des formules pour estimer les temps de fabrication (ex: temps de perçage basé sur le nombre et la taille des trous)
                  </p>
                </div>
                <Button onClick={addFormula} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une formule
                </Button>
              </div>

              {/* Templates pour formules de temps d'opération */}
              {formData.formulas && formData.formulas.length === 0 && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-blue-800">📋 Templates de formules de temps d'opération</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-xs text-blue-700 space-y-2">
                      <div className="bg-white p-2 rounded border border-blue-200">
                        <p className="font-medium mb-1">⏱️ Temps de perçage (avec agrégation) :</p>
                        <p className="font-mono text-xs">sum(trous.quantite) * 2.5</p>
                        <p className="text-gray-600 mt-1">Somme toutes les quantités de trous et multiplie par 2.5 min/trou</p>
                        <p className="text-xs text-blue-600 mt-1">⚡ Utilisez des noms sans accents : quantite, diametre, epaisseur</p>
                      </div>
                      <div className="bg-white p-2 rounded border border-blue-200">
                        <p className="font-medium mb-1">⏱️ Temps de perçage avec taille :</p>
                        <p className="font-mono text-xs">sum(trous.quantite) * (avg(trous.diametre) / 10) * 1.5</p>
                        <p className="text-gray-600 mt-1">Temps ajusté selon le diamètre moyen des trous</p>
                        <p className="text-xs text-blue-600 mt-1">⚡ Utilisez des noms sans accents : quantite, diametre, epaisseur</p>
                      </div>
                      <div className="bg-white p-2 rounded border border-blue-200">
                        <p className="font-medium mb-1">⏱️ Temps de découpe laser :</p>
                        <p className="font-mono text-xs">(longueur + largeur) * 2 * 0.1</p>
                        <p className="text-gray-600 mt-1">Temps basé sur le périmètre de la pièce</p>
                      </div>
                      <div className="bg-white p-2 rounded border border-blue-200">
                        <p className="font-medium mb-1">⏱️ Nombre total d'opérations :</p>
                        <p className="font-mono text-xs">count(trous) + count(plis)</p>
                        <p className="text-gray-600 mt-1">Compte le nombre total de trous et de plis</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                <SelectItem value="geometry">Géométrie (volume, surface, périmètre)</SelectItem>
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

                        <div className="space-y-2">
                          <Label className="text-xs">
                            Formule (syntaxe mathjs){" "}
                            {formula.category === "time" && (
                              <span className="text-blue-600">⏱️ Temps d'opération</span>
                            )}
                          </Label>
                          
                          {/* Sélecteur de champs extractibles */}
                          <div className="mb-2 p-3 bg-gray-50 rounded border">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-semibold text-gray-700">📋 Champs extractibles disponibles:</span>
                            </div>
                            {formData.customFields && formData.customFields.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {formData.customFields.map((field) => {
                                  const isObject = field.type === "objet" || field.type === "liste_objets"
                                  const hasProperties = isObject && field.structure && field.structure.properties && field.structure.properties.length > 0
                                  
                                  const handleInsertField = (property?: string) => {
                                    const fieldName = field.name
                                    let insertText = fieldName
                                    
                                    if (property) {
                                      // Propriété sélectionnée
                                      insertText = `${fieldName}.${property}`
                                    }
                                    
                                    // Insérer dans la formule à la position du curseur
                                    const textarea = document.querySelector(`textarea[data-formula-index="${index}"]`) as HTMLTextAreaElement
                                    if (textarea) {
                                      const start = textarea.selectionStart || 0
                                      const end = textarea.selectionEnd || 0
                                      const currentFormula = formula.formula
                                      const before = currentFormula.substring(0, start)
                                      const after = currentFormula.substring(end)
                                      const needsOperator = before.length > 0 && !/[+\-*/(\s]/.test(before[before.length - 1])
                                      const newFormula = before + (needsOperator ? " + " : "") + insertText + after
                                      updateFormula(index, { ...formula, formula: newFormula })
                                      
                                      // Remettre le focus et la position du curseur
                                      setTimeout(() => {
                                        textarea.focus()
                                        const newPos = start + insertText.length + (needsOperator ? 3 : 0)
                                        textarea.setSelectionRange(newPos, newPos)
                                      }, 0)
                                    } else {
                                      // Fallback: ajouter à la fin
                                      const needsOperator = formula.formula.length > 0 && !/[+\-*/(\s]/.test(formula.formula[formula.formula.length - 1])
                                      updateFormula(index, { 
                                        ...formula, 
                                        formula: formula.formula + (needsOperator ? " + " : "") + insertText 
                                      })
                                    }
                                  }
                                  
                                  return (
                                    <div key={field.id} className="flex flex-col gap-1">
                                      {!hasProperties ? (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleInsertField()}
                                          className="h-7 text-xs"
                                        >
                                          {field.label || field.name}
                                        </Button>
                                      ) : (
                                        <Select
                                          onValueChange={(value) => {
                                            if (value === "field") {
                                              handleInsertField()
                                            } else {
                                              handleInsertField(value)
                                            }
                                          }}
                                        >
                                          <SelectTrigger className="h-7 text-xs w-auto min-w-[140px]">
                                            <SelectValue placeholder={field.label || field.name} />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="field">
                                              <span className="font-medium">{field.label || field.name}</span> (champ complet)
                                            </SelectItem>
                                            {field.structure?.properties.map((prop) => (
                                              <SelectItem key={prop} value={prop}>
                                                {field.label || field.name}.<span className="font-semibold">{prop}</span>
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500 italic">Aucun champ extractible défini. Créez d'abord des champs dans l'onglet "Champs extractibles".</span>
                            )}
                          </div>
                          
                          <Textarea
                            data-formula-index={index}
                            value={formula.formula}
                            onChange={(e) =>
                              updateFormula(index, { ...formula, formula: e.target.value })
                            }
                            placeholder={
                              formula.category === "time"
                                ? "Ex: trous.quantite * 2.5 (temps de perçage en minutes)"
                                : "Ex: longueur * largeur * epaisseur"
                            }
                            rows={3}
                            className="text-sm font-mono"
                          />
                          {formula.category === "time" && (
                            <p className="text-xs text-blue-600 mt-1">
                              💡 Exemples : trous.quantite * 2.5 | (longueur + largeur) * 2 * 0.1 | procedes.length * 3
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                            <Label className="text-xs">
                              Variables utilisées 
                              <span className="text-gray-500 ml-1">(détectées automatiquement)</span>
                            </Label>
                            <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 rounded border min-h-[2.5rem]">
                              {(() => {
                                const { valid, unknown } = getFormulaVariables(formula)
                                const hasVariables = valid.length > 0 || unknown.length > 0
                                
                                if (!hasVariables && !formula.formula.trim()) {
                                  return (
                                    <span className="text-xs text-gray-400 italic">
                                      Aucune variable détectée
                                    </span>
                                  )
                                }
                                
                                if (!hasVariables && formula.formula.trim()) {
                                  return (
                                    <span className="text-xs text-amber-600">
                                      ⚠️ Aucune variable détectée. Vérifiez que vous utilisez les noms exacts des champs extractibles.
                                    </span>
                                  )
                                }
                                
                                return (
                                  <>
                                    {valid.map((variable) => (
                                      <Badge
                                        key={variable}
                                        variant="outline"
                                        className="text-xs bg-green-50 text-green-700 border-green-300"
                                      >
                                        ✓ {variable}
                                      </Badge>
                                    ))}
                                    {unknown.map((variable) => (
                                      <Badge
                                        key={variable}
                                        variant="outline"
                                        className="text-xs bg-amber-50 text-amber-700 border-amber-300"
                                      >
                                        ⚠ {variable}
                                      </Badge>
                                    ))}
                                  </>
                                )
                              })()}
                            </div>
                            {(() => {
                              const { valid, unknown } = getFormulaVariables(formula)
                              if (unknown.length > 0) {
                                return (
                                  <p className="text-xs text-amber-600 mt-1">
                                    ⚠️ {unknown.length} variable{unknown.length > 1 ? 's' : ''} inconnue{unknown.length > 1 ? 's' : ''} : {unknown.join(', ')}. Vérifiez que ces noms correspondent aux champs extractibles définis.
                                  </p>
                                )
                              }
                              return null
                            })()}
                          </div>
                        </div>

                        <div className={`p-2 rounded text-xs ${
                          formula.category === "time"
                            ? "bg-blue-50 text-blue-800"
                            : "bg-green-50 text-green-800"
                        }`}>
                          {formula.category === "time" ? (
                            <>
                              💡 <strong>Formule de temps d'opération :</strong> Utilisez les champs extraits pour calculer les temps de fabrication.
                              <br />
                              Exemples de variables : <code className="bg-white px-1 rounded">trous.quantite</code>,{" "}
                              <code className="bg-white px-1 rounded">trous.diametre</code>,{" "}
                              <code className="bg-white px-1 rounded">longueur</code>,{" "}
                              <code className="bg-white px-1 rounded">procedes.length</code>
                              <br />
                              <strong className="text-blue-600">⚡ Important:</strong> Utilisez des noms SANS ACCENTS (quantite, diametre, epaisseur)
                            </>
                          ) : (
                            <>
                              💡 Utilisez les noms des champs extraits comme variables (ex: trous.quantite, longueur, largeur)
                              <br />
                              <strong className="text-blue-600">⚡ Important:</strong> Utilisez des noms SANS ACCENTS (quantite, diametre, epaisseur)
                            </>
                          )}
                          <br />
                          <br />
                          <strong>📊 Fonctions d'agrégation pour listes d'objets :</strong>
                          <br />
                          <code className="bg-white px-1 rounded">sum(champ.propriete)</code> - Somme de toutes les valeurs
                          <br />
                          <code className="bg-white px-1 rounded">avg(champ.propriete)</code> - Moyenne
                          <br />
                          <code className="bg-white px-1 rounded">max(champ.propriete)</code> - Maximum
                          <br />
                          <code className="bg-white px-1 rounded">min(champ.propriete)</code> - Minimum
                          <br />
                          <code className="bg-white px-1 rounded">count(champ)</code> - Nombre d'éléments
                          <br />
                          <span className="text-xs italic">Ex: sum(trous.quantite) * 2.5</span>
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
