"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { Client } from "@/types/analysis"
import ClientModal from "./client-modal"

interface ClientSelectorProps {
  selectedClient: Client | null
  onClientSelect: (client: Client | null) => void
}

export default function ClientSelector({ selectedClient, onClientSelect }: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/clients")

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && Array.isArray(data.clients)) {
        setClients(data.clients)

        // Si un client était sélectionné, le retrouver dans la nouvelle liste
        if (selectedClient) {
          const updatedClient = data.clients.find((c: Client) => c.id === selectedClient.id)
          if (updatedClient) {
            onClientSelect(updatedClient)
          } else {
            onClientSelect(null)
          }
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des clients:", error)
      setClients([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClientSave = async (client: Client) => {
    try {
      const method = clients.find((c) => c.id === client.id) ? "PUT" : "POST"
      const url = method === "PUT" ? `/api/clients/${client.id}` : "/api/clients"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(client),
      })

      const data = await response.json()

      if (data.success) {
        await loadClients()
        setIsModalOpen(false)
        onClientSelect(client)
      } else {
        alert("Erreur lors de la sauvegarde: " + (data.error || "Erreur inconnue"))
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error)
      alert("Erreur lors de la sauvegarde du client")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select
          value={selectedClient?.id || "none"}
          onValueChange={(value) => {
            if (value === "none") {
              onClientSelect(null)
            } else {
              const client = clients.find((c) => c.id === value)
              onClientSelect(client || null)
            }
          }}
          disabled={isLoading}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={isLoading ? "Chargement..." : "Sélectionner un client"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun client</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={() => setIsModalOpen(true)} disabled={isLoading}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {selectedClient && (
        <div className="text-sm text-gray-600 space-y-1">
          {selectedClient.email && <p>📧 {selectedClient.email}</p>}
          {selectedClient.phone && <p>📞 {selectedClient.phone}</p>}
        </div>
      )}

      <ClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} client={null} onSave={handleClientSave} />
    </div>
  )
}
