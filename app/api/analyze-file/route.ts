import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const prompt = formData.get("prompt") as string

    if (!file || !prompt) {
      return NextResponse.json({ success: false, error: "Fichier et prompt requis" })
    }

    // Créer un nouveau FormData pour l'API externe
    const externalFormData = new FormData()
    externalFormData.append("action", "GEMINI_FILE_LIGHT")
    externalFormData.append("prompt", prompt)
    externalFormData.append("file", file)

    console.log("Appel à l'API externe...")

    const response = await fetch(
      "https://n8n.tools.intelligenceindustrielle.com/webhook/54563f03-935e-4865-aa4e-949632147de8",
      {
        method: "POST",
        body: externalFormData,
      },
    )

    if (!response.ok) {
      throw new Error(`Erreur API externe: ${response.status}`)
    }

    const data = await response.json()
    console.log("Réponse API externe:", data)

    if (data.success && data.results?.[0]?.gemini_response) {
      let analysisData
      const geminiResponse = data.results[0].gemini_response

      try {
        // Nettoyer la réponse
        let cleanedResponse = geminiResponse.trim()
        if (cleanedResponse.startsWith("```json")) {
          cleanedResponse = cleanedResponse.replace(/```json\s*/, "").replace(/```\s*$/, "")
        }
        if (cleanedResponse.startsWith("```")) {
          cleanedResponse = cleanedResponse.replace(/```[^`]*/, "").replace(/```\s*$/, "")
        }

        analysisData = JSON.parse(cleanedResponse)
      } catch (parseError) {
        console.error("Erreur parsing:", parseError)
        // Données par défaut en cas d'erreur
        analysisData = {
          référence_dessin: { valeur: "Non spécifié", confiance: 0, raison: "Erreur de parsing" },
          description: { valeur: "Non spécifié", confiance: 0, raison: "Erreur de parsing" },
          matériau: { valeur: "Non spécifié", confiance: 0, raison: "Erreur de parsing" },
          type_pièce: { valeur: "autre", confiance: 0, raison: "Erreur de parsing" },
          dimensions: {},
          procédés: [],
          notes_importantes: [],
        }
      }

      return NextResponse.json({ success: true, analysisData })
    } else {
      return NextResponse.json({ success: false, error: "Réponse invalide de l'API d'analyse" })
    }
  } catch (error) {
    console.error("Erreur API route:", error)
    return NextResponse.json({ success: false, error: error.message })
  }
}
