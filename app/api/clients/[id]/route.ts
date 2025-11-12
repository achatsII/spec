import { type NextRequest, NextResponse } from "next/server"

const API_ENDPOINT = "https://n8n.tools.intelligenceindustrielle.com/webhook/6852d509-086a-4415-a48c-ca72e7ceedb3"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await request.json()
    const clientId = params.id

    console.log("Mise à jour du client:", clientId, client)

    // Validation
    if (!client.name || !client.name.trim()) {
      return NextResponse.json({ success: false, error: "Le nom du client est obligatoire" })
    }

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "UPDATE",
        software_id: "technical-drawing-analyzer",
        data_type: "client",
        document_id: clientId,
        description: `Client: ${client.name}`,
        json_data: {
          name: client.name,
          email: client.email || "",
          phone: client.phone || "",
          address: client.address || "",
          notes: client.notes || "",
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

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "DELETE",
        software_id: "technical-drawing-analyzer",
        data_type: "client",
        document_id: clientId,
      }),
    })

    const data = await response.json()
    console.log("Réponse API DELETE:", data)

    if (data.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: "Erreur lors de la suppression" })
    }
  } catch (error) {
    console.error("Erreur lors de la suppression du client:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    })
  }
}
