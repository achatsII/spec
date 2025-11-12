import { type NextRequest, NextResponse } from "next/server"

const API_ENDPOINT = "https://n8n.tools.intelligenceindustrielle.com/webhook/6852d509-086a-4415-a48c-ca72e7ceedb3"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const profile = await request.json()
    const profileId = params.id

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
        software_id: "technical-drawing-analyzer",
        data_type: "extraction-profile",
        document_id: profileId,
        description: `Profil d'extraction: ${profile.name}`,
        json_data: {
          name: profile.name,
          description: profile.description || "",
          customFields: profile.customFields || [],
          formulas: profile.formulas || [],
          compatibleMaterialIds: profile.compatibleMaterialIds || [],
          createdAt: profile.createdAt,
          updatedAt: new Date().toISOString(),
        },
      }),
    })

    const data = await response.json()

    if (data.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: "Erreur lors de la mise à jour" })
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour du profil:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const profileId = params.id

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "DELETE",
        software_id: "technical-drawing-analyzer",
        data_type: "extraction-profile",
        document_id: profileId,
      }),
    })

    const data = await response.json()

    if (data.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: "Erreur lors de la suppression" })
    }
  } catch (error) {
    console.error("Erreur lors de la suppression du profil:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    })
  }
}
