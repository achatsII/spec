import { type NextRequest, NextResponse } from "next/server"
import { callGateway } from "@/lib/api-gateway"

const APP_IDENTIFIER = "technical-drawing-analyzer"
const DATA_TYPE = "analysis"

export async function POST(request: NextRequest) {
  try {
    const { parentId, newLatestId } = await request.json()

    if (!parentId || !newLatestId) {
      return NextResponse.json({ success: false, error: "parentId et newLatestId sont requis" })
    }

    // Récupérer toutes les versions de cette analyse
    const filterResponse = await callGateway(`/api/v1/data/${DATA_TYPE}/filter`, {
      method: "POST",
      body: JSON.stringify({
        mongo_filter: {
          "json_data.app_identifier": { "$eq": APP_IDENTIFIER },
          "$or": [
            { "json_data.parentId": { "$eq": parentId } },
            { "_id": { "$eq": parentId } },
          ],
        },
      }),
    })

    const filterData = await filterResponse.json()

    if (filterData.success && Array.isArray(filterData.results)) {
      // Marquer toutes les versions sauf la nouvelle comme non-latest
      for (const result of filterData.results) {
        if (result._id !== newLatestId) {
          const updateResponse = await callGateway(`/api/v1/data/${DATA_TYPE}/one/${result._id}`, {
            method: "PUT",
            body: JSON.stringify({
              description: `Analyse: ${result.json_data?.title || "Sans titre"}`,
              json_data: {
                ...result.json_data,
                isLatest: false,
                updatedAt: new Date().toISOString(),
              },
            }),
          })

          const updateData = await updateResponse.json()
          if (!updateData.success) {
            console.error(`Erreur lors de la mise à jour de la version ${result._id}`)
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur lors de la mise à jour des versions:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    })
  }
}

