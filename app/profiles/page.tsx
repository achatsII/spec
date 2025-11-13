"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Settings } from "lucide-react"
import type { ExtractionProfile } from "@/types/analysis"
import ExtractionProfileModal from "@/components/extraction-profile-modal"
import Link from "next/link"

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<ExtractionProfile[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<ExtractionProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/extraction-profiles")
      const data = await response.json()

      if (data.success && Array.isArray(data.profiles)) {
        setProfiles(data.profiles)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des profils:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleProfileSave = async (profile: ExtractionProfile) => {
    try {
      const method = editingProfile ? "PUT" : "POST"
      const url = editingProfile ? `/api/extraction-profiles/${profile.id}` : "/api/extraction-profiles"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      })

      const data = await response.json()

      if (data.success) {
        await loadProfiles()
        setIsModalOpen(false)
        setEditingProfile(null)
      } else {
        alert("Erreur lors de la sauvegarde: " + (data.error || "Erreur inconnue"))
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error)
      alert("Erreur lors de la sauvegarde du profil")
    }
  }

  const handleProfileDelete = async (profileId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce profil d'extraction ?")) {
      return
    }

    try {
      const response = await fetch(`/api/extraction-profiles/${profileId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        await loadProfiles()
      } else {
        alert("Erreur lors de la suppression: " + (data.error || "Erreur inconnue"))
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error)
      alert("Erreur lors de la suppression du profil")
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
                <Settings className="h-8 w-8 text-[#0078FF]" />
                Profils d'Extraction
              </h1>
              <p className="text-gray-600 mt-2">
                {profiles.length} profil{profiles.length !== 1 ? "s" : ""} configuré{profiles.length !== 1 ? "s" : ""}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Définissez les champs à extraire et les formules de calcul pour chaque type d'analyse
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
            <Button
              onClick={() => {
                setEditingProfile(null)
                setIsModalOpen(true)
              }}
              className="bg-[#0078FF] hover:bg-[#0078FF]/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau profil d'extraction
            </Button>
          </CardContent>
        </Card>

        {/* Liste des profils */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center text-gray-500">Chargement...</CardContent>
            </Card>
          ) : profiles.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center text-gray-500">
                <p className="font-medium mb-2">Aucun profil d'extraction configuré</p>
                <p className="text-sm">Créez votre premier profil pour définir les champs et formules d'extraction</p>
              </CardContent>
            </Card>
          ) : (
            profiles.map((profile) => (
              <Card key={profile.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="truncate flex-1">{profile.name}</span>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingProfile(profile)
                          setIsModalOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleProfileDelete(profile.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {profile.customFields.length} champ{profile.customFields.length !== 1 ? "s" : ""} personnalisé
                      {profile.customFields.length !== 1 ? "s" : ""}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {profile.formulas.length} formule{profile.formulas.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>

                  {profile.customFields.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs font-medium text-gray-700 mb-1">Champs extraits:</p>
                      <div className="flex flex-wrap gap-1">
                        {profile.customFields.slice(0, 3).map((field) => (
                          <Badge key={field.id} variant="outline" className="text-xs">
                            {field.label || field.name}
                          </Badge>
                        ))}
                        {profile.customFields.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{profile.customFields.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {profile.formulas.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs font-medium text-gray-700 mb-1">Formules:</p>
                      <div className="space-y-1">
                        {profile.formulas.slice(0, 2).map((formula) => (
                          <div key={formula.id} className="text-xs text-gray-600">
                            • {formula.name}{" "}
                            <Badge variant="outline" className="text-xs ml-1">
                              {formula.category}
                            </Badge>
                          </div>
                        ))}
                        {profile.formulas.length > 2 && (
                          <p className="text-xs text-gray-500">+{profile.formulas.length - 2} formules</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 text-xs text-gray-400">
                    Créé le {new Date(profile.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <ExtractionProfileModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingProfile(null)
        }}
        profile={editingProfile}
        onSave={handleProfileSave}
      />
    </div>
  )
}
