import { type NextRequest, NextResponse } from "next/server"
import { callGateway } from "@/lib/api-gateway"

const APP_IDENTIFIER = "technical-drawing-analyzer"
const DATA_TYPE = "analysis"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const analysisId = params.id
    console.log("Récupération de l'analyse:", analysisId)

    const response = await callGateway(`/api/v1/data/${DATA_TYPE}/one/${analysisId}`, {
      method: "GET",
    })

    const data = await response.json()

    if (data.success && data.result) {
      const analysis = {
        id: data.result._id,
        ...data.result.json_data,
      }
      return NextResponse.json({ success: true, analysis })
    } else {
      return NextResponse.json({ success: false, error: "Analyse non trouvée" })
    }
  } catch (error) {
    console.error("Erreur lors de la récupération de l'analyse:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const analysis = await request.json()
    const analysisId = params.id

    console.log("Mise à jour de l'analyse:", analysisId)

    const response = await callGateway(`/api/v1/data/${DATA_TYPE}/one/${analysisId}`, {
      method: "PUT",
      body: JSON.stringify({
        description: `Analyse: ${analysis.title}`,
        json_data: {
          ...analysis,
          app_identifier: APP_IDENTIFIER,
          updatedAt: new Date().toISOString(),
        },
      }),
    })

    const data = await response.json()
    console.log("Réponse API UPDATE:", data)

    if (data.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: "Erreur lors de la mise à jour" })
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'analyse:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const analysisId = params.id
    console.log("Suppression de l'analyse:", analysisId)

    const response = await callGateway(`/api/v1/data/${DATA_TYPE}/${analysisId}`, {
      method: "DELETE",
    })

    const data = await response.json()
    console.log("Réponse API DELETE:", data)

    if (data.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: data.error || "Erreur lors de la suppression" })
    }
  } catch (error) {
    console.error("Erreur lors de la suppression de l'analyse:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    })
  }
}
