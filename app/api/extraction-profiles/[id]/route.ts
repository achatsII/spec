import { type NextRequest, NextResponse } from "next/server"
import { callGateway } from "@/lib/api-gateway"

const APP_IDENTIFIER = "technical-drawing-analyzer"
const DATA_TYPE = "extraction-profile"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const profileId = params.id
    console.log("Récupération du profil d'extraction:", profileId)

    const response = await callGateway(`/api/v1/data/${DATA_TYPE}/one/${profileId}`, {
      method: "GET",
    })

    const data = await response.json()

    if (!data.success) {
      console.error("❌ Erreur Gateway:", data)
      return NextResponse.json({ success: false, error: data.error || "Erreur lors de la récupération" })
    }

    if (!data.result || !data.result.json_data) {
      console.error("❌ Pas de données dans le résultat")
      return NextResponse.json({ success: false, error: "Profil non trouvé" })
    }

    const jsonData = data.result.json_data

    const profile = {
      id: data.result._id,
      name: jsonData.name || "Profil sans nom",
      description: jsonData.description || "",
      customFields: jsonData.customFields || [],
      formulas: jsonData.formulas || [],
      compatibleMaterialIds: jsonData.compatibleMaterialIds || [],
      createdAt: jsonData.createdAt ? new Date(jsonData.createdAt) : new Date(),
      updatedAt: jsonData.updatedAt ? new Date(jsonData.updatedAt) : new Date(),
    }

    return NextResponse.json({ success: true, profile })
  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const profile = await request.json()
    const profileId = params.id

    if (!profile.name || !profile.name.trim()) {
      return NextResponse.json({ success: false, error: "Le nom du profil est obligatoire" })
    }

    const response = await callGateway(`/api/v1/data/${DATA_TYPE}/one/${profileId}`, {
      method: "PUT",
      body: JSON.stringify({
        description: `Profil d'extraction: ${profile.name}`,
        json_data: {
          name: profile.name,
          description: profile.description || "",
          customFields: profile.customFields || [],
          formulas: profile.formulas || [],
          compatibleMaterialIds: profile.compatibleMaterialIds || [],
          app_identifier: APP_IDENTIFIER,
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

    const response = await callGateway(`/api/v1/data/${DATA_TYPE}/${profileId}`, {
      method: "DELETE",
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
