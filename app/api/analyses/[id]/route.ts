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

    console.log("🔍 Réponse Gateway brute pour ID:", analysisId, {
      success: data.success,
      hasResult: !!data.result,
      resultKeys: data.result ? Object.keys(data.result) : [],
      resultType: typeof data.result,
      hasJsonData: !!data.result?.json_data,
      error: data.error,
      fullData: JSON.stringify(data, null, 2).substring(0, 1000), // Limiter la taille pour les logs
    })

    if (!data.success) {
      console.error("❌ Erreur Gateway pour ID:", analysisId, data)
      // Si l'erreur indique que l'analyse n'existe pas, retourner un message plus clair
      if (data.error?.includes("not found") || data.error?.includes("does not exist") || data.error?.includes("404")) {
        return NextResponse.json({ 
          success: false, 
          error: `Analyse avec l'ID "${analysisId}" non trouvée dans la base de données` 
        })
      }
      return NextResponse.json({ 
        success: false, 
        error: data.error || "Erreur lors de la récupération",
        debug: { analysisId, gatewayError: data.error }
      })
    }

    if (!data.result) {
      console.error("❌ Pas de résultat dans la réponse Gateway pour ID:", analysisId)
      return NextResponse.json({ 
        success: false, 
        error: `Analyse avec l'ID "${analysisId}" non trouvée`,
        debug: { analysisId, responseData: data }
      })
    }

    // Essayer de récupérer json_data, ou utiliser result directement si json_data n'existe pas
    let jsonData = data.result.json_data
    
    console.log("🔍 Vérification json_data:", {
      hasJsonData: !!jsonData,
      resultKeys: Object.keys(data.result),
      resultSample: JSON.stringify(data.result, null, 2).substring(0, 500),
    })
    
    // Si json_data n'existe pas, peut-être que les données sont directement dans result
    if (!jsonData && data.result) {
      // Vérifier si result contient directement les propriétés de l'analyse
      const hasAnalysisProperties = data.result.title || data.result.analysisResult || data.result.clientId
      console.log("🔍 Vérification propriétés directes:", {
        hasTitle: !!data.result.title,
        hasAnalysisResult: !!data.result.analysisResult,
        hasClientId: !!data.result.clientId,
        hasAnalysisProperties,
        allKeys: Object.keys(data.result),
      })
      
      if (hasAnalysisProperties) {
        console.log("⚠️ json_data manquant, utilisation directe de result")
        jsonData = data.result
      }
    }

    // Vérifier que json_data existe maintenant
    if (!jsonData) {
      const resultKeys = Object.keys(data.result)
      console.error("❌ Pas de json_data dans le résultat pour ID:", analysisId, {
        resultKeys,
        resultType: typeof data.result,
        resultValue: resultKeys.length === 1 && resultKeys[0] === '_id' 
          ? `Seulement _id: ${data.result._id}`
          : JSON.stringify(data.result, null, 2).substring(0, 1000),
      })
      return NextResponse.json({ 
        success: false, 
        error: "Données d'analyse manquantes dans la base de données",
        debug: {
          hasResult: !!data.result,
          resultKeys: resultKeys,
          analysisId: analysisId,
        }
      })
    }
    
    console.log("🔍 JSON data:", {
      hasJsonData: !!jsonData,
      jsonDataKeys: Object.keys(jsonData),
      hasAnalysisResult: !!jsonData.analysisResult,
      jsonDataType: typeof jsonData,
    })
    
    // Vérifier que les données essentielles sont présentes
    if (!jsonData.title && !jsonData.analysisResult) {
      console.error("❌ Données essentielles manquantes:", {
        hasTitle: !!jsonData.title,
        hasAnalysisResult: !!jsonData.analysisResult,
        jsonDataKeys: Object.keys(jsonData),
        jsonData: JSON.stringify(jsonData, null, 2).substring(0, 500),
      })
      return NextResponse.json({ success: false, error: "Données d'analyse invalides" })
    }
    
    // Convertir les dates string en objets Date si nécessaire
    // S'assurer que toutes les propriétés sont bien copiées
    // L'ID MongoDB doit toujours être dans _id, et doit avoir la priorité
    // Ne pas utiliser jsonData.id car il peut contenir un ID client
    const finalAnalysisId = data.result._id || analysisId
    
    // Extraire l'ID client de jsonData si présent (pour référence, mais ne pas l'utiliser comme ID principal)
    const { id: jsonDataClientId, ...jsonDataWithoutId } = jsonData
    
    const analysis: any = {
      ...jsonDataWithoutId,
      id: finalAnalysisId, // Toujours utiliser l'ID MongoDB comme ID principal
    }
    
    // Convertir les dates
    analysis.createdAt = jsonData.createdAt ? new Date(jsonData.createdAt) : new Date()
    analysis.updatedAt = jsonData.updatedAt ? new Date(jsonData.updatedAt) : new Date()
    
    // S'assurer que analysisResult a les bonnes dates aussi
    if (jsonData.analysisResult) {
      analysis.analysisResult = {
        ...jsonData.analysisResult,
        timestamp: jsonData.analysisResult.timestamp 
          ? (typeof jsonData.analysisResult.timestamp === 'string' 
              ? new Date(jsonData.analysisResult.timestamp) 
              : jsonData.analysisResult.timestamp instanceof Date
              ? jsonData.analysisResult.timestamp
              : new Date(jsonData.analysisResult.timestamp))
          : new Date(),
      }
    }
    
    // S'assurer que calculationResult a les bonnes dates aussi
    if (jsonData.calculationResult && jsonData.calculationResult.calculatedAt) {
      analysis.calculationResult = {
        ...jsonData.calculationResult,
        calculatedAt: typeof jsonData.calculationResult.calculatedAt === 'string'
          ? new Date(jsonData.calculationResult.calculatedAt)
          : jsonData.calculationResult.calculatedAt,
      }
    }
    
    console.log("✅ Analyse construite:", {
      id: analysis.id,
      title: analysis.title,
      hasFileUrl: !!analysis.fileUrl,
      hasAnalysisResult: !!analysis.analysisResult,
      hasAnalysisResultFileUrl: !!analysis.analysisResult?.fileUrl,
    })
    
    return NextResponse.json({ success: true, analysis })
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
    console.log("🗑️ Suppression de l'analyse:", analysisId)

    // Vérifier si l'ID semble être un ID MongoDB valide ou un ID client
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(analysisId)
    const isClientId = analysisId.startsWith("analysis_")
    
    if (isClientId && !isMongoId) {
      console.warn("⚠️ Tentative de suppression avec un ID client au lieu d'un ID MongoDB:", analysisId)
      // Essayer de trouver l'analyse avec cet ID dans json_data
      // Si l'analyse existe avec cet ID client dans json_data, on ne peut pas la supprimer directement
      // car le gateway utilise _id pour la suppression
      return NextResponse.json({ 
        success: false, 
        error: `Impossible de supprimer l'analyse avec l'ID "${analysisId}". Cet ID semble être un ID client. Utilisez l'ID MongoDB retourné par l'API.` 
      })
    }

    const response = await callGateway(`/api/v1/data/${DATA_TYPE}/${analysisId}`, {
      method: "DELETE",
    })

    const data = await response.json()
    console.log("✅ Réponse API DELETE:", {
      success: data.success,
      error: data.error,
      analysisId
    })

    if (data.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: data.error || "Erreur lors de la suppression",
        debug: { analysisId }
      })
    }
  } catch (error) {
    console.error("❌ Erreur lors de la suppression de l'analyse:", {
      analysisId: params.id,
      error: error instanceof Error ? error.message : "Erreur inconnue",
      stack: error instanceof Error ? error.stack : undefined
    })
    
    // Si l'erreur vient du gateway (erreur 500, 404, etc.)
    if (error instanceof Error && error.message.includes("Gateway API Error")) {
      const statusMatch = error.message.match(/Gateway API Error (\d+)/)
      const status = statusMatch ? statusMatch[1] : "500"
      
      if (status === "404") {
        return NextResponse.json({
          success: false,
          error: `Analyse avec l'ID "${params.id}" non trouvée dans la base de données`,
          debug: { analysisId: params.id }
        })
      }
      
      return NextResponse.json({
        success: false,
        error: `Erreur du serveur lors de la suppression: ${error.message}`,
        debug: { analysisId: params.id, gatewayError: error.message }
      })
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue lors de la suppression",
      debug: { analysisId: params.id }
    })
  }
}
