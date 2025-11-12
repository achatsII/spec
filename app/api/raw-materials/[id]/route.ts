import { type NextRequest, NextResponse } from "next/server"
import { callGateway } from "@/lib/api-gateway"

const APP_IDENTIFIER = "technical-drawing-analyzer"
const DATA_TYPE = "raw-material"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const material = await request.json()
    const materialId = params.id

    console.log("Mise à jour de la matière première:", materialId, material)

    // Validation
    if (!material.name || !material.name.trim()) {
      return NextResponse.json({ success: false, error: "Le nom de la matière première est obligatoire" })
    }

    const response = await callGateway(`/api/v1/data/${DATA_TYPE}/one/${materialId}`, {
      method: "PUT",
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
          createdAt: material.createdAt,
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
    console.error("Erreur lors de la mise à jour de la matière première:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const materialId = params.id
    console.log("Suppression de la matière première:", materialId)

    const response = await callGateway(`/api/v1/data/${DATA_TYPE}/${materialId}`, {
      method: "DELETE",
    })

    const data = await response.json()
    console.log("Réponse API DELETE:", data)

    if (data.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: "Erreur lors de la suppression" })
    }
  } catch (error) {
    console.error("Erreur lors de la suppression de la matière première:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    })
  }
}
