"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
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
    <div>
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
          <SelectTrigger className="flex-1 h-8 text-sm">
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
          className="h-8 w-8"
        >
          <Plus className="h-3 w-3" />
        </Button>
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
