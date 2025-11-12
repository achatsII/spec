import { type NextRequest, NextResponse } from "next/server"
import { callGateway } from "@/lib/api-gateway"

const APP_IDENTIFIER = "technical-drawing-analyzer"
const DATA_TYPE = "analysis"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get("clientId")

    console.log("Début de la requête GET_ALL pour les analyses", clientId ? `du client ${clientId}` : "")

    // Construire le filtre MongoDB
    const mongoFilter: any = {
      "json_data.app_identifier": {
        "$eq": APP_IDENTIFIER,
      },
    }

    // Ajouter le filtre client si demandé
    if (clientId) {
      mongoFilter["json_data.clientId"] = {
        "$eq": clientId,
      }
    }

    const response = await callGateway(`/api/v1/data/${DATA_TYPE}/filter`, {
      method: "POST",
      body: JSON.stringify({
        mongo_filter: mongoFilter,
      }),
    })

    const data = await response.json()

    if (data.success && Array.isArray(data.results)) {
      const analyses = data.results.map((result: any) => ({
        id: result._id,
        ...result.json_data,
        createdAt: result.json_data?.createdAt || new Date().toISOString(),
        updatedAt: result.json_data?.updatedAt || new Date().toISOString(),
      }))

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

    const response = await callGateway(`/api/v1/data/${DATA_TYPE}`, {
      method: "POST",
      body: JSON.stringify({
        description: `Analyse: ${analysis.title}`,
        json_data: {
          ...analysis,
          app_identifier: APP_IDENTIFIER,
          createdAt: now,
          updatedAt: now,
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
    console.error("Erreur lors de la sauvegarde de l'analyse:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    })
  }
}
