import { type NextRequest, NextResponse } from "next/server"
import { callGateway, getAuthHeadersMultipart, getGatewayUrl } from "@/lib/api-gateway"

interface AgentTrace {
  agent: string
  input: {
    prompt: string
    fileName: string
  }
  output: any
  timestamp: string
  duration: number
}

// Fonction helper pour appeler l'API Gemini via Gateway avec retry
async function callGeminiAgent(
  file: File,
  prompt: string,
  agentName: string,
  retryCount = 0,
  maxRetries = 2,
): Promise<{ data: any; trace: AgentTrace }> {
  const startTime = Date.now()

  console.log(`[${agentName}] Démarrage de l'analyse via Gateway... (tentative ${retryCount + 1}/${maxRetries + 1})`)

  try {
    // Étape 1: Upload du fichier pour obtenir une URL
    console.log(`[${agentName}] Étape 1: Upload du fichier...`)
    console.log(`[${agentName}] Nom du fichier: ${file.name}, Taille: ${file.size} bytes, Type: ${file.type}`)
    
    const uploadFormData = new FormData()
    uploadFormData.append("files", file)
    uploadFormData.append("path", "analyzes")

    let fileUrl: string
    try {
      // Uploader le fichier avec /api/v1/files/upload/direct pour obtenir une URL
      const uploadUrl = getGatewayUrl("/api/v1/files/upload/direct")
      const uploadHeaders = getAuthHeadersMultipart()
      
      console.log(`[${agentName}] Upload URL: ${uploadUrl}`)
      
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: uploadHeaders,
        body: uploadFormData,
      })
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text().catch(() => "Impossible de lire le body")
        console.error(`[${agentName}] Erreur upload HTTP: ${uploadResponse.status}`, errorText)
        throw new Error(`Erreur upload fichier: ${uploadResponse.status} - ${errorText.substring(0, 200)}`)
      }
      
      const uploadData = await uploadResponse.json()
      
      console.log(`[${agentName}] Réponse upload:`, JSON.stringify(uploadData, null, 2))
      
      if (!uploadData.success || !uploadData.files?.[0]?.url) {
        console.error(`[${agentName}] Échec upload - success: ${uploadData.success}, files:`, uploadData.files)
        throw new Error(`Échec de l'upload du fichier: ${JSON.stringify(uploadData)}`)
      }
      
      fileUrl = uploadData.files[0].url
      console.log(`[${agentName}] Fichier uploadé avec succès, URL: ${fileUrl.substring(0, 80)}...`)
    } catch (uploadError: any) {
      console.error(`[${agentName}] Erreur lors de l'upload:`, uploadError.message)
      console.error(`[${agentName}] Stack:`, uploadError.stack)
      throw new Error(`[${agentName}] Erreur upload: ${uploadError.message}`)
    }

    // Étape 2: Analyse du fichier via /api/v1/ai/files/analyze
    console.log(`[${agentName}] Étape 2: Analyse du fichier...`)
    const analyzeResponse = await callGateway("/api/v1/ai/files/analyze", {
      method: "POST",
      body: JSON.stringify({
        prompt: prompt,
        urls: [fileUrl],
        model: "2.5-FLASH",
      }),
    })

    const analyzeData = await analyzeResponse.json()
    const duration = Date.now() - startTime

    console.log(`[${agentName}] Réponse analyse:`, JSON.stringify(analyzeData, null, 2))

    if (!analyzeData.success || !analyzeData.results?.[0]?.analysis) {
      console.error(`[${agentName}] Réponse d'analyse invalide`)
      // Retry si réponse invalide et qu'on n'a pas atteint le max
      if (retryCount < maxRetries) {
        console.log(`[${agentName}] Nouvelle tentative dans 2 secondes...`)
        await new Promise((resolve) => setTimeout(resolve, 2000))
        return callGeminiAgent(file, prompt, agentName, retryCount + 1, maxRetries)
      }
      throw new Error("Réponse invalide de l'API d'analyse après plusieurs tentatives")
    }

    // Parser la réponse JSON de l'analyse
    let parsedData
    try {
      const analysisText = analyzeData.results[0].analysis.trim()
      let cleanedResponse = analysisText

      // Nettoyer les balises markdown si présentes
      if (cleanedResponse.startsWith("```json")) {
        cleanedResponse = cleanedResponse.replace(/```json\s*/, "").replace(/```\s*$/, "")
      }
      if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse.replace(/```[^`]*/, "").replace(/```\s*$/, "")
      }

      parsedData = JSON.parse(cleanedResponse)
      console.log(`[${agentName}] JSON parsé avec succès`)
    } catch (parseError) {
      console.error(`[${agentName}] Erreur parsing JSON:`, parseError)
      console.error(`[${agentName}] Contenu reçu (premiers 500 chars):`, analyzeData.results?.[0]?.analysis?.substring(0, 500) || "N/A")
      parsedData = {
        référence_dessin: { valeur: "Non spécifié", confiance: 0, raison: "Erreur de parsing" },
        description: { valeur: "Non spécifié", confiance: 0, raison: "Erreur de parsing" },
        matériau: { valeur: "Non spécifié", confiance: 0, raison: "Erreur de parsing" },
        type_pièce: { valeur: "autre", confiance: 0, raison: "Erreur de parsing" },
        dimensions: {},
        procédés: [],
        notes_importantes: [],
      }
    }

    const trace: AgentTrace = {
      agent: agentName,
      input: {
        prompt: prompt.substring(0, 200) + "...", // Tronquer pour le log
        fileName: file.name,
      },
      output: parsedData,
      timestamp: new Date().toISOString(),
      duration,
    }

    console.log(`[${agentName}] Analyse terminée en ${duration}ms`)

    return { data: parsedData, trace }
  } catch (error) {
    // Si c'est une erreur de retry, la relancer
    if (error instanceof Error && error.message.includes("tentatives")) {
      throw error
    }
    // Si c'est une erreur et qu'on peut retry
    if (retryCount < maxRetries) {
      console.log(`[${agentName}] Nouvelle tentative dans 2 secondes...`)
      await new Promise((resolve) => setTimeout(resolve, 2000))
      return callGeminiAgent(file, prompt, agentName, retryCount + 1, maxRetries)
    }
    // Sinon, wrapper l'erreur
    throw new Error(`[${agentName}] ${error instanceof Error ? error.message : "Erreur inconnue"}`)
  }
}

export async function POST(request: NextRequest) {
  const allTraces: AgentTrace[] = []

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const prompt = formData.get("prompt") as string

    if (!file || !prompt) {
      return NextResponse.json({ success: false, error: "Fichier et prompt requis" })
    }

    // ============================================
    // AGENT 1: ANALYSEUR PRINCIPAL
    // ============================================
    console.log("[ARCHITECTURE MULTI-AGENTS] Démarrage de l'analyse...")

    const principalPrompt = prompt
    const { data: principalData, trace: principalTrace } = await callGeminiAgent(
      file,
      principalPrompt,
      "Agent Principal",
    )
    allTraces.push(principalTrace)

    // ============================================
    // AGENT 2: VÉRIFICATEUR
    // ============================================
    const verifierPrompt = `Tu es un agent verificateur specialise dans la validation et la correction d'analyses de plans techniques.

Tu dois re-analyser le plan technique fourni et comparer avec le resultat de l'agent principal suivant:

RESULTAT DE L'AGENT PRINCIPAL:
${JSON.stringify(principalData, null, 2)}

TA MISSION:
1. Re-analyser le plan avec attention particuliere aux erreurs ou omissions
2. Identifier les champs avec une confiance faible (< 70%)
3. Corriger les erreurs evidentes
4. Completer les informations manquantes si visibles sur le plan
5. Augmenter la precision des valeurs extraites

Reponds dans le meme format JSON que l'agent principal, mais avec des corrections et ameliorations. Si tu confirmes une valeur, augmente sa confiance. Si tu trouves une erreur, corrige-la et explique pourquoi dans la raison.`

    const { data: verifierData, trace: verifierTrace } = await callGeminiAgent(
      file,
      verifierPrompt,
      "Agent Vérificateur",
    )
    allTraces.push(verifierTrace)

    // ============================================
    // AGENT 3: COMPILATEUR FINAL
    // ============================================
    const compilerPrompt = `Tu es un agent compilateur final charge de synthetiser les resultats de plusieurs agents d'analyse.

Tu as recu deux analyses du meme plan technique:

ANALYSE 1 (Agent Principal):
${JSON.stringify(principalData, null, 2)}

ANALYSE 2 (Agent Verificateur):
${JSON.stringify(verifierData, null, 2)}

TA MISSION:
1. Synthetiser les deux analyses pour produire le JSON final le plus precis possible
2. Pour chaque champ, choisir la valeur la plus fiable (confiance la plus elevee)
3. Si les deux agents sont d'accord, augmenter la confiance
4. Si les agents divergent, choisir la valeur la plus logique et documenter dans la raison
5. Combiner les informations complementaires des deux analyses
6. S'assurer que tous les champs requis sont presents

Reponds UNIQUEMENT avec le JSON final synthetise, sans texte supplementaire. Le format doit etre identique a celui des analyses individuelles.`

    const { data: compiledData, trace: compilerTrace } = await callGeminiAgent(
      file,
      compilerPrompt,
      "Agent Compilateur",
    )
    allTraces.push(compilerTrace)

    // ============================================
    // RETOUR DU RÉSULTAT FINAL
    // ============================================
    console.log("[ARCHITECTURE MULTI-AGENTS] Analyse terminée avec succès")
    console.log(`[TRACES] ${allTraces.length} agents executés`)

    return NextResponse.json({
      success: true,
      analysisData: compiledData,
      traces: allTraces, // Traçabilité complète pour debugging
    })
  } catch (error) {
    console.error("Erreur API route:", error)
    console.error("[TRACES]", allTraces)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
      traces: allTraces, // Retourner les traces même en cas d'erreur
    })
  }
}
