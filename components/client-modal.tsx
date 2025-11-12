"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Client } from "@/types/analysis"

interface ClientModalProps {
  isOpen: boolean
  onClose: () => void
  client: Client | null
  onSave: (client: Client) => void
}

export default function ClientModal({ isOpen, onClose, client, onSave }: ClientModalProps) {
  const [formData, setFormData] = useState<Partial<Client>>({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  })

  useEffect(() => {
    if (client) {
      setFormData(client)
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        notes: "",
      })
    }
  }, [client, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name?.trim()) {
      alert("Le nom du client est obligatoire")
      return
    }

    const clientData: Client = {
      id: client?.id || `client_${Date.now()}`,
      name: formData.name,
      email: formData.email || "",
      phone: formData.phone || "",
      address: formData.address || "",
      notes: formData.notes || "",
      createdAt: client?.createdAt || new Date(),
      updatedAt: new Date(),
    }

    onSave(clientData)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? "Modifier le client" : "Nouveau client"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Nom du client <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: ACME Manufacturing"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Courriel</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@client.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Rue Principale, Ville, Province, Code Postal"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes additionnelles sur le client..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" className="bg-[#0078FF] hover:bg-[#0078FF]/90">
              {client ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
