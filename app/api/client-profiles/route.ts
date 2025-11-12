import { type NextRequest, NextResponse } from "next/server"

const API_ENDPOINT = "https://n8n.tools.intelligenceindustrielle.com/webhook/6852d509-086a-4415-a48c-ca72e7ceedb3"

export async function GET() {
  try {
    console.log("Début de la requête GET_ALL pour les profils")

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "GET_ALL",
        software_id: "technical-drawing-analyzer",
        data_type: "client-profile",
      }),
    })

    console.log("Statut de la réponse:", response.status)

    if (!response.ok) {
      console.error("Erreur HTTP:", response.status, response.statusText)
      return NextResponse.json({
        success: false,
        profiles: [],
        error: `Erreur HTTP: ${response.status}`,
      })
    }

    const contentType = response.headers.get("content-type")
    console.log("Content-Type:", contentType)

    if (!contentType || !contentType.includes("application/json")) {
      const textResponse = await response.text()
      console.error("Réponse non-JSON:", textResponse)
      return NextResponse.json({
        success: false,
        profiles: [],
        error: "Réponse invalide de l'API externe",
      })
    }

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

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "POST",
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

    const data = await response.json()
    console.log("Réponse API POST:", data)

    if (data.success) {
      return NextResponse.json({ success: true, id: data.results[0].inserted_id })
    } else {
      return NextResponse.json({ success: false, error: "Erreur lors de la sauvegarde" })
    }
  } catch (error) {
    console.error("Erreur lors de la sauvegarde du profil:", error)
    return NextResponse.json({ success: false, error: error.message })
  }
}
