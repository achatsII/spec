import { type NextRequest, NextResponse } from "next/server"
import { callGateway } from "@/lib/api-gateway"

const APP_IDENTIFIER = "technical-drawing-analyzer"
const DATA_TYPE = "extraction-profile"

export async function GET() {
  try {
    console.log("Début de la requête GET_ALL pour les profils d'extraction")

    // Utiliser le filtre MongoDB pour ne récupérer que les profils de cette app
    const response = await callGateway(`/api/v1/data/${DATA_TYPE}/filter`, {
      method: "POST",
      body: JSON.stringify({
        mongo_filter: {
          "json_data.app_identifier": {
            "$eq": APP_IDENTIFIER,
          },
        },
      }),
    })

    const data = await response.json()

    if (data.success && Array.isArray(data.results)) {
      const profiles = data.results.map((result: any) => ({
        id: result._id,
        name: result.json_data?.name || "Profil sans nom",
        description: result.json_data?.description || "",
        customFields: result.json_data?.customFields || [],
        formulas: result.json_data?.formulas || [],
        compatibleMaterialIds: result.json_data?.compatibleMaterialIds || [],
        createdAt: result.json_data?.createdAt || new Date().toISOString(),
        updatedAt: result.json_data?.updatedAt || new Date().toISOString(),
      }))

      return NextResponse.json({ success: true, profiles })
    } else {
      return NextResponse.json({ success: true, profiles: [] })
    }
  } catch (error) {
    console.error("Erreur lors du chargement des profils d'extraction:", error)
    return NextResponse.json({
      success: false,
      profiles: [],
      error: error instanceof Error ? error.message : "Erreur inconnue",
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await request.json()

    if (!profile.name || !profile.name.trim()) {
      return NextResponse.json({ success: false, error: "Le nom du profil est obligatoire" })
    }

    const now = new Date().toISOString()

    const response = await callGateway(`/api/v1/data/${DATA_TYPE}`, {
      method: "POST",
      body: JSON.stringify({
        description: `Profil d'extraction: ${profile.name}`,
        json_data: {
          name: profile.name,
          description: profile.description || "",
          customFields: profile.customFields || [],
          formulas: profile.formulas || [],
          compatibleMaterialIds: profile.compatibleMaterialIds || [],
          app_identifier: APP_IDENTIFIER,
          createdAt: now,
          updatedAt: now,
        },
      }),
    })

    const data = await response.json()

    if (data.success && data.results?.[0]?.inserted_id) {
      return NextResponse.json({ success: true, id: data.results[0].inserted_id })
    } else {
      return NextResponse.json({ success: false, error: "Erreur lors de la sauvegarde" })
    }
  } catch (error) {
    console.error("Erreur lors de la sauvegarde du profil:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    })
  }
}
