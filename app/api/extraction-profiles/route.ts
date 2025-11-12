import { type NextRequest, NextResponse } from "next/server"

const API_ENDPOINT = "https://n8n.tools.intelligenceindustrielle.com/webhook/6852d509-086a-4415-a48c-ca72e7ceedb3"

export async function GET() {
  try {
    console.log("Début de la requête GET_ALL pour les profils d'extraction")

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "GET_ALL",
        software_id: "technical-drawing-analyzer",
        data_type: "extraction-profile",
      }),
    })

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        profiles: [],
        error: `Erreur HTTP: ${response.status}`,
      })
    }

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

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "POST",
        software_id: "technical-drawing-analyzer",
        data_type: "extraction-profile",
        description: `Profil d'extraction: ${profile.name}`,
        json_data: {
          name: profile.name,
          description: profile.description || "",
          customFields: profile.customFields || [],
          formulas: profile.formulas || [],
          compatibleMaterialIds: profile.compatibleMaterialIds || [],
          createdAt: now,
          updatedAt: now,
        },
      }),
    })

    const data = await response.json()

    if (data.success) {
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
