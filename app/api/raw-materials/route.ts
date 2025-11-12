import { type NextRequest, NextResponse } from "next/server"

const API_ENDPOINT = "https://n8n.tools.intelligenceindustrielle.com/webhook/6852d509-086a-4415-a48c-ca72e7ceedb3"

export async function GET() {
  try {
    console.log("Début de la requête GET_ALL pour les matières premières")

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "GET_ALL",
        software_id: "technical-drawing-analyzer",
        data_type: "raw-material",
      }),
    })

    console.log("Statut de la réponse:", response.status)

    if (!response.ok) {
      console.error("Erreur HTTP:", response.status, response.statusText)
      return NextResponse.json({
        success: false,
        materials: [],
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
        materials: [],
        error: "Réponse invalide de l'API externe",
      })
    }

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

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "POST",
        software_id: "technical-drawing-analyzer",
        data_type: "raw-material",
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
    console.error("Erreur lors de la sauvegarde de la matière première:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    })
  }
}
