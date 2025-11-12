import { type NextRequest, NextResponse } from "next/server"
import { callGateway } from "@/lib/api-gateway"

const APP_IDENTIFIER = "technical-drawing-analyzer"
const DATA_TYPE = "client"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await request.json()
    const clientId = params.id

    console.log("Mise à jour du client:", clientId, client)

    // Validation
    if (!client.name || !client.name.trim()) {
      return NextResponse.json({ success: false, error: "Le nom du client est obligatoire" })
    }

    const response = await callGateway(`/api/v1/data/${DATA_TYPE}/one/${clientId}`, {
      method: "PUT",
      body: JSON.stringify({
        description: `Client: ${client.name}`,
        json_data: {
          name: client.name,
          email: client.email || "",
          phone: client.phone || "",
          address: client.address || "",
          notes: client.notes || "",
          app_identifier: APP_IDENTIFIER,
          createdAt: client.createdAt,
          updatedAt: new Date().toISOString(),
        },
      }),
    })

    const data = await response.json()
    console.log("Réponse API UPDATE:", data)

    if (data.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: "Erreur lors de la mise à jour" })
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour du client:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const clientId = params.id
    console.log("Suppression du client:", clientId)

    const response = await callGateway(`/api/v1/data/${DATA_TYPE}/${clientId}`, {
      method: "DELETE",
    })

    const data = await response.json()
    console.log("Réponse API DELETE:", data)

    if (data.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: data.error || "Erreur lors de la suppression" })
    }
  } catch (error) {
    console.error("Erreur lors de la suppression du client:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    })
  }
}
