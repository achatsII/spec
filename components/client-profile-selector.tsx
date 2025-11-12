"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2 } from "lucide-react"
import type { ClientProfile } from "@/types/analysis"
import ClientProfileModal from "./client-profile-modal"

interface ClientProfileSelectorProps {
  selectedProfile: ClientProfile | null
  onProfileSelect: (profile: ClientProfile | null) => void
}

export default function ClientProfileSelector({ selectedProfile, onProfileSelect }: ClientProfileSelectorProps) {
  const [profiles, setProfiles] = useState<ClientProfile[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<ClientProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/client-profiles")

      // Vérifier si la réponse est OK
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`)
      }

      // Vérifier le content-type
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text()
        console.error("Réponse non-JSON reçue:", textResponse)
        throw new Error("Réponse invalide du serveur (non-JSON)")
      }

      const data = await response.json()
      console.log("Profils chargés:", data)

      if (data.success && Array.isArray(data.profiles)) {
        setProfiles(data.profiles)

        // Si un profil était sélectionné, le retrouver dans la nouvelle liste
        if (selectedProfile) {
          const updatedProfile = data.profiles.find((p: ClientProfile) => p.id === selectedProfile.id)
          if (updatedProfile) {
            onProfileSelect(updatedProfile)
          } else {
            onProfileSelect(null)
          }
        }
      } else {
        console.warn("Format de réponse inattendu:", data)
        setProfiles([])
      }
    } catch (error) {
      console.error("Erreur lors du chargement des profils:", error)
      setProfiles([])

      // Afficher une erreur plus détaillée à l'utilisateur
      if (error.message.includes("JSON.parse")) {
        console.error("Erreur de parsing JSON - la réponse du serveur n'est pas au format JSON valide")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleProfileSave = async (profile: ClientProfile) => {
    try {
      const method = editingProfile ? "PUT" : "POST"
      const url = editingProfile ? `/api/client-profiles/${profile.id}` : "/api/client-profiles"

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

        // Sélectionner automatiquement le profil sauvegardé
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
      const response = await fetch(`/api/client-profiles/${profileId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        await loadProfiles()

        // Désélectionner le profil s'il était sélectionné
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

  const openEditModal = (profile: ClientProfile) => {
    console.log("Ouverture du modal d'édition pour:", profile)
    setEditingProfile({ ...profile }) // Créer une copie pour éviter les mutations
    setIsModalOpen(true)
  }

  const openCreateModal = () => {
    console.log("Ouverture du modal de création")
    setEditingProfile(null)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingProfile(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select
          value={selectedProfile?.id || "none"}
          onValueChange={(value) => {
            console.log("Sélection du profil:", value)
            if (value === "none") {
              onProfileSelect(null)
            } else {
              const profile = profiles.find((p) => p.id === value)
              console.log("Profil trouvé:", profile)
              onProfileSelect(profile || null)
            }
          }}
          disabled={isLoading}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={isLoading ? "Chargement..." : "Sélectionner un profil client"} />
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

        <Button variant="outline" size="icon" onClick={openCreateModal} disabled={isLoading}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {selectedProfile && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">{selectedProfile.name}</h4>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => openEditModal(selectedProfile)}>
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
          <div className="text-sm text-gray-600">
            <p>Matériaux: {selectedProfile.materials?.length || 0} types</p>
            <p>Formules: {selectedProfile.formulas?.length || 0} règles</p>
          </div>
        </div>
      )}

      <ClientProfileModal
        isOpen={isModalOpen}
        onClose={closeModal}
        profile={editingProfile}
        onSave={handleProfileSave}
      />
    </div>
  )
}
