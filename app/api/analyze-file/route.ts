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

// Fonction pour convertir le format tableau d'objets en format objet existant
function convertArrayFormatToObjectFormat(arrayData: any[]): any {
  const result: any = {
    dimensions: {},
    procédés: [],
    notes_importantes: [],
    champs_personnalises: {},
  }

  arrayData.forEach((item) => {
    const { name, data_type, value, confidence, justification } = item

    // Mapper les noms de champs
    switch (name) {
      case "reference_dessin":
      case "référence_dessin":
        result.référence_dessin = {
          valeur: value || "Non spécifié",
          confiance: confidence || 0,
          raison: justification || "Non trouvé",
        }
        break
      case "description":
        result.description = {
          valeur: value || "Non spécifié",
          confiance: confidence || 0,
          raison: justification || "Non trouvé",
        }
        break
      case "materiau":
      case "matériau":
        result.matériau = {
          valeur: value || "Non spécifié",
          confiance: confidence || 0,
          raison: justification || "Non trouvé",
        }
        break
      case "type_piece":
      case "type_pièce":
        result.type_pièce = {
          valeur: value || "autre",
          confiance: confidence || 0,
          raison: justification || "Non trouvé",
        }
        break
      case "longueur":
      case "largeur":
      case "hauteur":
      case "epaisseur":
      case "épaisseur":
        // Gérer les dimensions qui peuvent être des objets avec unité ou des valeurs simples
        if (typeof value === "object" && value !== null) {
          result.dimensions[name] = {
            valeur: value.valeur || value.value || 0,
            unite: value.unite || value.unit || value.unity || "mm",
            confiance: value.confidence || confidence || 0,
            raison: value.raison || value.justification || justification || "Non trouvé",
          }
        } else {
          result.dimensions[name] = {
            valeur: value || 0,
            unite: item.unit || item.unite || "mm",
            confiance: confidence || 0,
            raison: justification || "Non trouvé",
          }
        }
        break
      case "procedes":
      case "procédés":
        if (Array.isArray(value)) {
          result.procédés = value.map((v: any) => ({
            valeur: typeof v === "string" ? v : v.valeur || v,
            confiance: v.confidence || confidence || 0,
            raison: v.raison || v.justification || justification || "Non trouvé",
          }))
        } else {
          result.procédés.push({
            valeur: value || "Non spécifié",
            confiance: confidence || 0,
            raison: justification || "Non trouvé",
          })
        }
        break
      case "notes_importantes":
        if (Array.isArray(value)) {
          result.notes_importantes = value.map((v: any) => ({
            contenu: typeof v === "string" ? v : v.contenu || v.valeur || v,
            confiance: v.confidence || confidence || 0,
            raison: v.raison || v.justification || justification || "Non trouvé",
          }))
        } else {
          result.notes_importantes.push({
            contenu: value || "Non spécifié",
            confiance: confidence || 0,
            raison: justification || "Non trouvé",
          })
        }
        break
      case "dimensions":
        // Si dimensions est un objet dans le tableau, extraire ses propriétés
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          Object.keys(value).forEach((dimName) => {
            const dimValue = value[dimName]
            if (typeof dimValue === "object" && dimValue !== null) {
              result.dimensions[dimName] = {
                valeur: dimValue.valeur || dimValue.value || 0,
                unite: dimValue.unite || dimValue.unit || dimValue.unity || "mm",
                confiance: dimValue.confidence || confidence || 0,
                raison: dimValue.raison || dimValue.justification || justification || "Non trouvé",
              }
            } else {
              result.dimensions[dimName] = {
                valeur: dimValue || 0,
                unite: "mm",
                confiance: confidence || 0,
                raison: justification || "Non trouvé",
              }
            }
          })
        }
        break
      default:
        // Champs personnalisés
        result.champs_personnalises[name] = {
          valeur: value || "Non spécifié",
          confiance: confidence || 0,
          raison: justification || "Non trouvé",
        }
        break
    }
  })

  return result
}

// Fonction helper pour appeler l'API Gemini via Gateway avec retry
async function callGeminiAgent(
  file: File,
  prompt: string,
  agentName: string,
  retryCount = 0,
  maxRetries = 2,
): Promise<{ data: any; trace: AgentTrace; fileUrl: string }> {
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
      if (cleanedResponse.includes("```json")) {
        // Extraire le JSON entre ```json et ```
        const jsonMatch = cleanedResponse.match(/```json\s*([\s\S]*?)\s*```/)
        if (jsonMatch) {
          cleanedResponse = jsonMatch[1].trim()
        } else {
          // Essayer avec juste ```
          const jsonMatch2 = cleanedResponse.match(/```\s*([\s\S]*?)\s*```/)
          if (jsonMatch2) {
            cleanedResponse = jsonMatch2[1].trim()
          }
        }
      } else if (cleanedResponse.includes("```")) {
        // Extraire le JSON entre ``` et ```
        const jsonMatch = cleanedResponse.match(/```[^`]*\s*([\s\S]*?)\s*```/)
        if (jsonMatch) {
          cleanedResponse = jsonMatch[1].trim()
        }
      }

      // Si le texte commence par du texte non-JSON, chercher le premier { ou [
      if (!cleanedResponse.startsWith("{") && !cleanedResponse.startsWith("[")) {
        const firstBrace = Math.max(
          cleanedResponse.indexOf("{"),
          cleanedResponse.indexOf("[")
        )
        if (firstBrace > 0) {
          cleanedResponse = cleanedResponse.substring(firstBrace)
        }
      }

      // Si le texte se termine par du texte non-JSON, chercher le dernier } ou ]
      if (!cleanedResponse.endsWith("}") && !cleanedResponse.endsWith("]")) {
        const lastBrace = Math.max(
          cleanedResponse.lastIndexOf("}"),
          cleanedResponse.lastIndexOf("]")
        )
        if (lastBrace > 0) {
          cleanedResponse = cleanedResponse.substring(0, lastBrace + 1)
        }
      }

      parsedData = JSON.parse(cleanedResponse)
      const isArray = Array.isArray(parsedData)
      console.log(`[${agentName}] JSON parsé avec succès (format: ${isArray ? "tableau" : "objet"})`)
      if (isArray) {
        console.log(`[${agentName}] Nombre d'éléments dans le tableau: ${parsedData.length}`)
      }
    } catch (parseError) {
      console.error(`[${agentName}] Erreur parsing JSON:`, parseError)
      console.error(`[${agentName}] Contenu reçu (premiers 1000 chars):`, analyzeData.results?.[0]?.analysis?.substring(0, 1000) || "N/A")
      // Retourner un tableau vide en cas d'erreur pour maintenir la cohérence du format
      parsedData = []
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

    return { data: parsedData, trace, fileUrl }
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
    const { data: principalData, trace: principalTrace, fileUrl: principalFileUrl } = await callGeminiAgent(
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

IMPORTANT: Reponds UNIQUEMENT avec un tableau JSON d'objets dans le meme format que l'agent principal. Chaque objet doit avoir les cles suivantes:
- "name": le nom du champ
- "data_type": le type de donnees ("string", "number", "boolean", "array", "object", etc.)
- "value": la valeur extraite
- "confidence": un score de confiance entre 0 et 100
- "justification": l'explication de comment la valeur a ete obtenue

Si tu confirmes une valeur, augmente sa confiance. Si tu trouves une erreur, corrige-la et explique pourquoi dans la justification.`

    const { data: verifierData, trace: verifierTrace, fileUrl: verifierFileUrl } = await callGeminiAgent(
      file,
      verifierPrompt,
      "Agent Vérificateur",
    )
    allTraces.push(verifierTrace)

    // ============================================
    // AGENT 3: COMPILATEUR FINAL
    // ============================================
    const compilerPrompt = `Tu es un agent compilateur final charge de synthetiser les resultats de plusieurs agents d'analyse.

Tu as recu deux analyses du meme plan technique au format tableau JSON:

ANALYSE 1 (Agent Principal):
${JSON.stringify(principalData, null, 2)}

ANALYSE 2 (Agent Verificateur):
${JSON.stringify(verifierData, null, 2)}

TA MISSION:
1. Synthetiser les deux analyses pour produire le JSON final le plus precis possible
2. Pour chaque champ, choisir la valeur la plus fiable (confiance la plus elevee)
3. Si les deux agents sont d'accord, augmenter la confiance
4. Si les agents divergent, choisir la valeur la plus logique et documenter dans la justification
5. Combiner les informations complementaires des deux analyses
6. S'assurer que tous les champs requis sont presents

IMPORTANT: Reponds UNIQUEMENT avec un tableau JSON d'objets dans le meme format. Chaque objet doit avoir les cles suivantes:
- "name": le nom du champ (ex: "reference_dessin", "description", "materiau", "type_piece", etc.)
- "data_type": le type de donnees ("string", "number", "boolean", "array", "object", etc.)
- "value": la valeur extraite
- "confidence": un score de confiance entre 0 et 100
- "justification": l'explication de comment la valeur a ete obtenue

Reponds UNIQUEMENT avec le JSON, sans texte supplementaire.`

    const { data: compiledDataRaw, trace: compilerTrace, fileUrl: compilerFileUrl } = await callGeminiAgent(
      file,
      compilerPrompt,
      "Agent Compilateur",
    )
    allTraces.push(compilerTrace)

    // Convertir le format tableau en format objet si nécessaire
    let compiledData = compiledDataRaw
    if (Array.isArray(compiledDataRaw)) {
      console.log("[Agent Compilateur] Conversion du format tableau en format objet")
      if (compiledDataRaw.length === 0) {
        console.warn("[Agent Compilateur] Tableau vide reçu, utilisation de valeurs par défaut")
        compiledData = {
          référence_dessin: { valeur: "Non spécifié", confiance: 0, raison: "Aucune donnée extraite" },
          description: { valeur: "Non spécifié", confiance: 0, raison: "Aucune donnée extraite" },
          matériau: { valeur: "Non spécifié", confiance: 0, raison: "Aucune donnée extraite" },
          type_pièce: { valeur: "autre", confiance: 0, raison: "Aucune donnée extraite" },
          dimensions: {},
          procédés: [],
          notes_importantes: [],
          champs_personnalises: {},
        }
      } else {
        compiledData = convertArrayFormatToObjectFormat(compiledDataRaw)
        console.log("[Agent Compilateur] Données converties:", JSON.stringify(compiledData, null, 2))
      }
    }

    // Utiliser le fileUrl du premier agent (ils sont tous identiques)
    const fileUrl = principalFileUrl || verifierFileUrl || compilerFileUrl

    // ============================================
    // RETOUR DU RÉSULTAT FINAL
    // ============================================
    console.log("[ARCHITECTURE MULTI-AGENTS] Analyse terminée avec succès")
    console.log(`[TRACES] ${allTraces.length} agents executés`)
    console.log(`[FILEURL] ${fileUrl}`)

    return NextResponse.json({
      success: true,
      analysisData: compiledData,
      fileUrl: fileUrl, // URL du fichier uploadé pour le preview
      fileType: file.type, // Type du fichier
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
