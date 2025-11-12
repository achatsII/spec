import { type NextRequest, NextResponse } from "next/server"

const API_ENDPOINT = "https://n8n.tools.intelligenceindustrielle.com/webhook/6852d509-086a-4415-a48c-ca72e7ceedb3"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const analysisId = params.id
    console.log("Récupération de l'analyse:", analysisId)

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "GET",
        software_id: "technical-drawing-analyzer",
        data_type: "analysis",
        document_id: analysisId,
      }),
    })

    const data = await response.json()

    if (data.success && data.results?.[0]) {
      const analysis = {
        id: data.results[0]._id,
        ...data.results[0].json_data,
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

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "UPDATE",
        software_id: "technical-drawing-analyzer",
        data_type: "analysis",
        document_id: analysisId,
        description: `Analyse: ${analysis.title}`,
        json_data: {
          ...analysis,
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

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "DELETE",
        software_id: "technical-drawing-analyzer",
        data_type: "analysis",
        document_id: analysisId,
      }),
    })

    const data = await response.json()
    console.log("Réponse API DELETE:", data)

    if (data.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: "Erreur lors de la suppression" })
    }
  } catch (error) {
    console.error("Erreur lors de la suppression de l'analyse:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    })
  }
}
