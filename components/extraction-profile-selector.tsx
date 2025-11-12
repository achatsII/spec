"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2 } from "lucide-react"
import type { ExtractionProfile } from "@/types/analysis"
import ExtractionProfileModal from "./extraction-profile-modal"

interface ExtractionProfileSelectorProps {
  selectedProfile: ExtractionProfile | null
  onProfileSelect: (profile: ExtractionProfile | null) => void
}

export default function ExtractionProfileSelector({
  selectedProfile,
  onProfileSelect,
}: ExtractionProfileSelectorProps) {
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

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && Array.isArray(data.profiles)) {
        setProfiles(data.profiles)

        // Si un profil était sélectionné, le retrouver
        if (selectedProfile) {
          const updatedProfile = data.profiles.find((p: ExtractionProfile) => p.id === selectedProfile.id)
          if (updatedProfile) {
            onProfileSelect(updatedProfile)
          } else {
            onProfileSelect(null)
          }
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des profils:", error)
      setProfiles([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleProfileSave = async (profile: ExtractionProfile) => {
    try {
      const method = profiles.find((p) => p.id === profile.id) ? "PUT" : "POST"
      const url = method === "PUT" ? `/api/extraction-profiles/${profile.id}` : "/api/extraction-profiles"

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
        onProfileSelect(profile)
      } else {
        alert("Erreur lors de la sauvegarde: " + (data.error || "Erreur inconnue"))
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error)
      alert("Erreur lors de la sauvegarde du profil")
    }
  }

  const handleProfileDelete = async (profileId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce profil ?")) {
      return
    }

    try {
      const response = await fetch(`/api/extraction-profiles/${profileId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        await loadProfiles()
        if (selectedProfile?.id === profileId) {
          onProfileSelect(null)
        }
      } else {
        alert("Erreur lors de la suppression: " + (data.error || "Erreur inconnue"))
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error)
      alert("Erreur lors de la suppression du profil")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select
          value={selectedProfile?.id || "none"}
          onValueChange={(value) => {
            if (value === "none") {
              onProfileSelect(null)
            } else {
              const profile = profiles.find((p) => p.id === value)
              onProfileSelect(profile || null)
            }
          }}
          disabled={isLoading}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={isLoading ? "Chargement..." : "Sélectionner un profil"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun profil</SelectItem>
            {profiles.map((profile) => (
              <SelectItem key={profile.id} value={profile.id}>
                {profile.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            setEditingProfile(null)
            setIsModalOpen(true)
          }}
          disabled={isLoading}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {selectedProfile && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h4 className="font-medium text-sm">{selectedProfile.name}</h4>
              {selectedProfile.description && (
                <p className="text-xs text-gray-600 mt-1">{selectedProfile.description}</p>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingProfile(selectedProfile)
                  setIsModalOpen(true)
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleProfileDelete(selectedProfile.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {selectedProfile.customFields?.length || 0} champ{selectedProfile.customFields?.length !== 1 ? "s" : ""}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {selectedProfile.formulas?.length || 0} formule{selectedProfile.formulas?.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          {selectedProfile.customFields && selectedProfile.customFields.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-gray-700 mb-1">Champs extraits:</p>
              <div className="flex flex-wrap gap-1">
                {selectedProfile.customFields.slice(0, 4).map((field) => (
                  <Badge key={field.id} variant="outline" className="text-xs">
                    {field.label || field.name}
                  </Badge>
                ))}
                {selectedProfile.customFields.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedProfile.customFields.length - 4}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      )}

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
