import { type NextRequest, NextResponse } from "next/server"
import { callGateway } from "@/lib/api-gateway"

const APP_IDENTIFIER = "technical-drawing-analyzer"
const DATA_TYPE = "client-profile"

export async function GET() {
  try {
    console.log("Début de la requête GET_ALL pour les profils")

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
    console.log("Réponse API GET_ALL:", data)

    if (data.success && Array.isArray(data.results)) {
      const profiles = data.results.map((result: any) => ({
        id: result._id,
        name: result.json_data?.name || "Profil sans nom",
        materials: result.json_data?.materials || [],
        formulas: result.json_data?.formulas || [],
      }))

      console.log("Profils traités:", profiles)
      return NextResponse.json({ success: true, profiles })
    } else {
      console.warn("Aucun profil trouvé ou format inattendu:", data)
      return NextResponse.json({ success: true, profiles: [] })
    }
  } catch (error) {
    console.error("Erreur lors du chargement des profils:", error)
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
    console.log("Création du profil:", profile)

    // Validation des données
    if (!profile.name || !profile.name.trim()) {
      return NextResponse.json({ success: false, error: "Le nom du profil est obligatoire" })
    }

    const response = await callGateway(`/api/v1/data/${DATA_TYPE}`, {
      method: "POST",
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
    console.log("Réponse API POST:", data)

    if (data.success && data.results?.[0]?.inserted_id) {
      return NextResponse.json({ success: true, id: data.results[0].inserted_id })
    } else {
      return NextResponse.json({ success: false, error: "Erreur lors de la sauvegarde" })
    }
  } catch (error) {
    console.error("Erreur lors de la sauvegarde du profil:", error)
    return NextResponse.json({ success: false, error: error.message })
  }
}
