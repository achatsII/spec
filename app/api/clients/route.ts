import { type NextRequest, NextResponse } from "next/server"
import { callGateway } from "@/lib/api-gateway"

const APP_IDENTIFIER = "technical-drawing-analyzer"
const DATA_TYPE = "client"

export async function GET() {
  try {
    console.log("Début de la requête GET_ALL pour les clients")

    // Utiliser le filtre MongoDB pour ne récupérer que les clients de cette app
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
      const clients = data.results.map((result: any) => ({
        id: result._id,
        name: result.json_data?.name || "Client sans nom",
        email: result.json_data?.email || "",
        phone: result.json_data?.phone || "",
        address: result.json_data?.address || "",
        notes: result.json_data?.notes || "",
        createdAt: result.json_data?.createdAt || new Date().toISOString(),
        updatedAt: result.json_data?.updatedAt || new Date().toISOString(),
      }))

      console.log("Clients traités:", clients.length)
      return NextResponse.json({ success: true, clients })
    } else {
      console.warn("Aucun client trouvé ou format inattendu:", data)
      return NextResponse.json({ success: true, clients: [] })
    }
  } catch (error) {
    console.error("Erreur lors du chargement des clients:", error)
    return NextResponse.json({
      success: false,
      clients: [],
      error: error instanceof Error ? error.message : "Erreur inconnue",
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await request.json()
    console.log("Création du client:", client)

    // Validation des données
    if (!client.name || !client.name.trim()) {
      return NextResponse.json({ success: false, error: "Le nom du client est obligatoire" })
    }

    const now = new Date().toISOString()

    const response = await callGateway(`/api/v1/data/${DATA_TYPE}`, {
      method: "POST",
      body: JSON.stringify({
        description: `Client: ${client.name}`,
        json_data: {
          name: client.name,
          email: client.email || "",
          phone: client.phone || "",
          address: client.address || "",
          notes: client.notes || "",
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
    console.error("Erreur lors de la sauvegarde du client:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    })
  }
}
