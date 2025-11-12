"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Edit, Trash2, Search, Download, Upload, Users } from "lucide-react"
import type { Client } from "@/types/analysis"
import ClientModal from "@/components/client-modal"
import Link from "next/link"

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadClients()
  }, [])

  useEffect(() => {
    // Filtrer les clients selon la recherche
    if (searchQuery.trim() === "") {
      setFilteredClients(clients)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredClients(
        clients.filter(
          (client) =>
            client.name.toLowerCase().includes(query) ||
            client.email?.toLowerCase().includes(query) ||
            client.phone?.includes(query)
        )
      )
    }
  }, [searchQuery, clients])

  const loadClients = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/clients")
      const data = await response.json()

      if (data.success && Array.isArray(data.clients)) {
        setClients(data.clients)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des clients:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClientSave = async (client: Client) => {
    try {
      const method = editingClient ? "PUT" : "POST"
      const url = editingClient ? `/api/clients/${client.id}` : "/api/clients"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(client),
      })

      const data = await response.json()

      if (data.success) {
        await loadClients()
        setIsModalOpen(false)
        setEditingClient(null)
      } else {
        alert("Erreur lors de la sauvegarde: " + (data.error || "Erreur inconnue"))
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error)
      alert("Erreur lors de la sauvegarde du client")
    }
  }

  const handleClientDelete = async (clientId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce client ?")) {
      return
    }

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        await loadClients()
      } else {
        alert("Erreur lors de la suppression: " + (data.error || "Erreur inconnue"))
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error)
      alert("Erreur lors de la suppression du client")
    }
  }

  const exportToCSV = () => {
    if (clients.length === 0) {
      alert("Aucun client à exporter")
      return
    }

    const headers = ["Nom", "Courriel", "Téléphone", "Adresse", "Notes", "Date de création"]
    const rows = clients.map((client) => [
      client.name,
      client.email || "",
      client.phone || "",
      client.address || "",
      client.notes || "",
      new Date(client.createdAt).toLocaleDateString(),
    ])

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `clients_${new Date().toISOString().split("T")[0]}.csv`
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
        const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim())

        const importedClients: Partial<Client>[] = []

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue

          const values = line.split(",").map((v) => v.replace(/"/g, "").trim())

          if (values.length >= 1 && values[0]) {
            importedClients.push({
              name: values[0],
              email: values[1] || "",
              phone: values[2] || "",
              address: values[3] || "",
              notes: values[4] || "",
            })
          }
        }

        // Importer les clients un par un
        for (const clientData of importedClients) {
          const client: Client = {
            id: `client_${Date.now()}_${Math.random()}`,
            name: clientData.name || "Client importé",
            email: clientData.email || "",
            phone: clientData.phone || "",
            address: clientData.address || "",
            notes: clientData.notes || "",
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          await fetch("/api/clients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(client),
          })
        }

        alert(`${importedClients.length} clients importés avec succès`)
        await loadClients()
      } catch (error) {
        console.error("Erreur lors de l'import:", error)
        alert("Erreur lors de l'import du fichier CSV")
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Users className="h-8 w-8 text-[#0078FF]" />
                Gestion des Clients
              </h1>
              <p className="text-gray-600 mt-2">
                {clients.length} client{clients.length !== 1 ? "s" : ""} enregistré{clients.length !== 1 ? "s" : ""}
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
                  setEditingClient(null)
                  setIsModalOpen(true)
                }}
                className="bg-[#0078FF] hover:bg-[#0078FF]/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouveau client
              </Button>

              <Button onClick={exportToCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exporter CSV
              </Button>

              <Button variant="outline" onClick={() => document.getElementById("import-csv")?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Importer CSV
              </Button>
              <input
                id="import-csv"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImportCSV}
              />
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Rechercher un client par nom, courriel ou téléphone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Clients List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center text-gray-500">Chargement...</CardContent>
            </Card>
          ) : filteredClients.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center text-gray-500">
                {searchQuery ? "Aucun client trouvé" : "Aucun client enregistré"}
              </CardContent>
            </Card>
          ) : (
            filteredClients.map((client) => (
              <Card key={client.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="truncate">{client.name}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingClient(client)
                          setIsModalOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleClientDelete(client.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {client.email && (
                    <p className="text-gray-600 truncate">
                      📧 {client.email}
                    </p>
                  )}
                  {client.phone && (
                    <p className="text-gray-600">
                      📞 {client.phone}
                    </p>
                  )}
                  {client.address && (
                    <p className="text-gray-600 text-xs truncate">
                      📍 {client.address}
                    </p>
                  )}
                  {client.notes && (
                    <p className="text-gray-500 text-xs italic truncate">
                      {client.notes}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 pt-2 border-t">
                    Créé le {new Date(client.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <ClientModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingClient(null)
        }}
        client={editingClient}
        onSave={handleClientSave}
      />
    </div>
  )
}
