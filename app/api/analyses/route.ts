import { type NextRequest, NextResponse } from "next/server"
import { callGateway } from "@/lib/api-gateway"

const APP_IDENTIFIER = "technical-drawing-analyzer"
const DATA_TYPE = "analysis"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get("clientId")
    const parentId = searchParams.get("parentId")

    console.log("Début de la requête GET_ALL pour les analyses", clientId ? `du client ${clientId}` : "", parentId ? `parent ${parentId}` : "")

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

    // Ajouter le filtre parentId si demandé (pour récupérer les versions)
    if (parentId) {
      mongoFilter["$or"] = [
        { "json_data.parentId": { "$eq": parentId } },
        { "_id": { "$eq": parentId } },
      ]
    }

    const response = await callGateway(`/api/v1/data/${DATA_TYPE}/filter`, {
      method: "POST",
      body: JSON.stringify({
        mongo_filter: mongoFilter,
      }),
    })

    const data = await response.json()

    if (data.success && Array.isArray(data.results)) {
      const analyses = data.results.map((result: any) => {
        // S'assurer que l'ID MongoDB a la priorité sur l'ID dans json_data
        const { id: jsonDataId, ...jsonDataWithoutId } = result.json_data || {}
        return {
          ...jsonDataWithoutId,
          id: result._id, // Toujours utiliser l'ID MongoDB comme ID principal
          createdAt: result.json_data?.createdAt || new Date().toISOString(),
          updatedAt: result.json_data?.updatedAt || new Date().toISOString(),
        }
      })

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

    // NETTOYAGE AUTOMATIQUE: Supprimer tous les anciens brouillons (draft) du même client
    // pour éviter l'accumulation dans la base de données
    if (analysis.status !== "draft") {
      try {
        console.log("🧹 Nettoyage des brouillons du client:", analysis.clientId)
        const deleteResponse = await callGateway(`/api/v1/data/${DATA_TYPE}/filter`, {
          method: "DELETE",
          body: JSON.stringify({
            mongo_filter: {
              "json_data.app_identifier": { "$eq": APP_IDENTIFIER },
              "json_data.clientId": { "$eq": analysis.clientId },
              "json_data.status": { "$eq": "draft" }
            }
          })
        })
        const deleteData = await deleteResponse.json()
        if (deleteData.success) {
          console.log(`✅ ${deleteData.deleted_count || 0} brouillon(s) supprimé(s)`)
        }
      } catch (cleanupError) {
        console.warn("⚠️ Erreur lors du nettoyage des brouillons (non bloquant):", cleanupError)
        // Ne pas bloquer la sauvegarde si le nettoyage échoue
      }
    }

    const now = new Date().toISOString()

    // Convertir les dates en ISO strings pour la sérialisation
    const analysisToSave = {
      ...analysis,
      createdAt: analysis.createdAt instanceof Date ? analysis.createdAt.toISOString() : (analysis.createdAt || now),
      updatedAt: analysis.updatedAt instanceof Date ? analysis.updatedAt.toISOString() : (analysis.updatedAt || now),
      // Convertir aussi les dates dans analysisResult si présentes
      analysisResult: analysis.analysisResult ? {
        ...analysis.analysisResult,
        timestamp: analysis.analysisResult.timestamp instanceof Date 
          ? analysis.analysisResult.timestamp.toISOString()
          : (analysis.analysisResult.timestamp || now),
      } : null,
      // Convertir les dates dans calculationResult si présentes
      calculationResult: analysis.calculationResult ? {
        ...analysis.calculationResult,
        calculatedAt: analysis.calculationResult.calculatedAt instanceof Date
          ? analysis.calculationResult.calculatedAt.toISOString()
          : (analysis.calculationResult.calculatedAt || now),
      } : null,
    }

    console.log("💾 Sauvegarde analyse:", {
      title: analysisToSave.title,
      hasFileUrl: !!analysisToSave.fileUrl,
      hasAnalysisResult: !!analysisToSave.analysisResult,
      hasCalculationResult: !!analysisToSave.calculationResult,
      currentStep: analysisToSave.currentStep,
      analysisResultKeys: analysisToSave.analysisResult ? Object.keys(analysisToSave.analysisResult) : [],
      hasExtractedData: !!analysisToSave.analysisResult?.extractedData,
      hasRawData: !!analysisToSave.analysisResult?.rawData,
      hasFileName: !!analysisToSave.fileName,
      hasFileType: !!analysisToSave.fileType,
      quantity: analysisToSave.quantity,
      clientId: analysisToSave.clientId,
      profileId: analysisToSave.profileId,
    })

    const response = await callGateway(`/api/v1/data/${DATA_TYPE}`, {
      method: "POST",
      body: JSON.stringify({
        description: `Analyse: ${analysis.title}`,
        json_data: {
          ...analysisToSave,
          app_identifier: APP_IDENTIFIER,
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
