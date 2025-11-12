import { type NextRequest, NextResponse } from "next/server"

const API_ENDPOINT = "https://n8n.tools.intelligenceindustrielle.com/webhook/6852d509-086a-4415-a48c-ca72e7ceedb3"

export async function GET() {
  try {
    console.log("Début de la requête GET_ALL pour les clients")

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "GET_ALL",
        software_id: "technical-drawing-analyzer",
        data_type: "client",
      }),
    })

    console.log("Statut de la réponse:", response.status)

    if (!response.ok) {
      console.error("Erreur HTTP:", response.status, response.statusText)
      return NextResponse.json({
        success: false,
        clients: [],
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
        clients: [],
        error: "Réponse invalide de l'API externe",
      })
    }

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

      console.log("Clients traités:", clients)
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

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "POST",
        software_id: "technical-drawing-analyzer",
        data_type: "client",
        description: `Client: ${client.name}`,
        json_data: {
          name: client.name,
          email: client.email || "",
          phone: client.phone || "",
          address: client.address || "",
          notes: client.notes || "",
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
    console.error("Erreur lors de la sauvegarde du client:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    })
  }
}
