import { type NextRequest, NextResponse } from "next/server"

const API_ENDPOINT = "https://n8n.tools.intelligenceindustrielle.com/webhook/6852d509-086a-4415-a48c-ca72e7ceedb3"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get("clientId")

    console.log("Début de la requête GET_ALL pour les analyses", clientId ? `du client ${clientId}` : "")

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "GET_ALL",
        software_id: "technical-drawing-analyzer",
        data_type: "analysis",
      }),
    })

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        analyses: [],
        error: `Erreur HTTP: ${response.status}`,
      })
    }

    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      return NextResponse.json({
        success: false,
        analyses: [],
        error: "Réponse invalide de l'API externe",
      })
    }

    const data = await response.json()

    if (data.success && Array.isArray(data.results)) {
      let analyses = data.results.map((result: any) => ({
        id: result._id,
        ...result.json_data,
        createdAt: result.json_data?.createdAt || new Date().toISOString(),
        updatedAt: result.json_data?.updatedAt || new Date().toISOString(),
      }))

      // Filtrer par client si demandé
      if (clientId) {
        analyses = analyses.filter((a: any) => a.clientId === clientId)
      }

      console.log("Analyses traitées:", analyses.length)
      return NextResponse.json({ success: true, analyses })
    } else {
      return NextResponse.json({ success: true, analyses: [] })
    }
  } catch (error) {
    console.error("Erreur lors du chargement des analyses:", error)
    return NextResponse.json({
      success: false,
      analyses: [],
      error: error instanceof Error ? error.message : "Erreur inconnue",
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const analysis = await request.json()
    console.log("Création de l'analyse:", analysis.title)

    // Validation des données
    if (!analysis.title || !analysis.title.trim()) {
      return NextResponse.json({ success: false, error: "Le titre de l'analyse est obligatoire" })
    }

    if (!analysis.clientId) {
      return NextResponse.json({ success: false, error: "Le client est obligatoire" })
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
        data_type: "analysis",
        description: `Analyse: ${analysis.title}`,
        json_data: {
          ...analysis,
          createdAt: now,
          updatedAt: now,
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
    console.error("Erreur lors de la sauvegarde de l'analyse:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    })
  }
}
