import { type NextRequest, NextResponse } from "next/server"
import { callGateway } from "@/lib/api-gateway"

const APP_IDENTIFIER = "technical-drawing-analyzer"
const DATA_TYPE = "client-profile"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const profile = await request.json()
    const profileId = params.id

    console.log("Mise à jour du profil:", profileId, profile)

    // Validation des données
    if (!profile.name || !profile.name.trim()) {
      return NextResponse.json({ success: false, error: "Le nom du profil est obligatoire" })
    }

    const response = await callGateway(`/api/v1/data/${DATA_TYPE}/one/${profileId}`, {
      method: "PUT",
      body: JSON.stringify({
        description: `Profil client: ${profile.name}`,
        json_data: {
          name: profile.name,
          materials: profile.materials || [],
          formulas: profile.formulas || [],
          app_identifier: APP_IDENTIFIER,
        },
      }),
    })

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

    const response = await callGateway(`/api/v1/data/${DATA_TYPE}/${profileId}`, {
      method: "DELETE",
    })

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
