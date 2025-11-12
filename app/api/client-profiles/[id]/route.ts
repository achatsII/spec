import { type NextRequest, NextResponse } from "next/server"

const API_ENDPOINT = "https://n8n.tools.intelligenceindustrielle.com/webhook/6852d509-086a-4415-a48c-ca72e7ceedb3"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const profile = await request.json()
    const profileId = params.id

    console.log("Mise à jour du profil:", profileId, profile)

    // Validation des données
    if (!profile.name || !profile.name.trim()) {
      return NextResponse.json({ success: false, error: "Le nom du profil est obligatoire" })
    }

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "UPDATE",
        record_id: profileId,
        software_id: "technical-drawing-analyzer",
        data_type: "client-profile",
        description: `Profil client: ${profile.name}`,
        json_data: {
          name: profile.name,
          materials: profile.materials || [],
          formulas: profile.formulas || [],
        },
      }),
    })

    if (!response.ok) {
      console.error("Erreur HTTP lors de la mise à jour:", response.status)
      return NextResponse.json({
        success: false,
        error: `Erreur HTTP: ${response.status}`,
      })
    }

    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      const textResponse = await response.text()
      console.error("Réponse non-JSON lors de la mise à jour:", textResponse)
      return NextResponse.json({
        success: false,
        error: "Réponse invalide de l'API externe",
      })
    }

    const data = await response.json()
    console.log("Réponse API UPDATE:", data)

    if (data.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({
        success: false,
        error: data.error || "Erreur lors de la mise à jour",
      })
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour du profil:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const profileId = params.id
    console.log("Suppression du profil:", profileId)

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "DELETE",
        record_id: profileId,
      }),
    })

    if (!response.ok) {
      console.error("Erreur HTTP lors de la suppression:", response.status)
      return NextResponse.json({
        success: false,
        error: `Erreur HTTP: ${response.status}`,
      })
    }

    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      const textResponse = await response.text()
      console.error("Réponse non-JSON lors de la suppression:", textResponse)
      return NextResponse.json({
        success: false,
        error: "Réponse invalide de l'API externe",
      })
    }

    const data = await response.json()
    console.log("Réponse API DELETE:", data)

    if (data.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({
        success: false,
        error: data.error || "Erreur lors de la suppression",
      })
    }
  } catch (error) {
    console.error("Erreur lors de la suppression du profil:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    })
  }
}
