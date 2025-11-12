import { type NextRequest, NextResponse } from "next/server"
import { callGateway } from "@/lib/api-gateway"

const APP_IDENTIFIER = "technical-drawing-analyzer"
const DATA_TYPE = "raw-material"

export async function GET() {
  try {
    console.log("Début de la requête GET_ALL pour les matières premières")

    // Utiliser le filtre MongoDB pour ne récupérer que les matières premières de cette app
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
      const materials = data.results.map((result: any) => ({
        id: result._id,
        name: result.json_data?.name || "Matériau sans nom",
        category: result.json_data?.category || "",
        material: result.json_data?.material || "",
        dimensions: result.json_data?.dimensions || "",
        standardLength: result.json_data?.standardLength || 0,
        unit: result.json_data?.unit || "",
        costPerUnit: result.json_data?.costPerUnit || 0,
        supplier: result.json_data?.supplier || "",
        reference: result.json_data?.reference || "",
        notes: result.json_data?.notes || "",
        createdAt: result.json_data?.createdAt || new Date().toISOString(),
        updatedAt: result.json_data?.updatedAt || new Date().toISOString(),
      }))

      console.log("Matières premières traitées:", materials)
      return NextResponse.json({ success: true, materials })
    } else {
      console.warn("Aucune matière première trouvée ou format inattendu:", data)
      return NextResponse.json({ success: true, materials: [] })
    }
  } catch (error) {
    console.error("Erreur lors du chargement des matières premières:", error)
    return NextResponse.json({
      success: false,
      materials: [],
      error: error instanceof Error ? error.message : "Erreur inconnue",
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const material = await request.json()
    console.log("Création de la matière première:", material)

    // Validation des données
    if (!material.name || !material.name.trim()) {
      return NextResponse.json({ success: false, error: "Le nom de la matière première est obligatoire" })
    }

    const now = new Date().toISOString()

    const response = await callGateway(`/api/v1/data/${DATA_TYPE}`, {
      method: "POST",
      body: JSON.stringify({
        description: `Matière première: ${material.name}`,
        json_data: {
          name: material.name,
          category: material.category || "",
          material: material.material || "",
          dimensions: material.dimensions || "",
          standardLength: material.standardLength || 0,
          unit: material.unit || "",
          costPerUnit: material.costPerUnit || 0,
          supplier: material.supplier || "",
          reference: material.reference || "",
          notes: material.notes || "",
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
    console.error("Erreur lors de la sauvegarde de la matière première:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    })
  }
}
