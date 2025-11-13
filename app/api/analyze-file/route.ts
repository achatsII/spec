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
        // Si c'est un objet avec value et unit, c'est probablement une dimension
        if (typeof value === "object" && value !== null && "value" in value && "unit" in value) {
          result.champs_personnalises[name] = {
            valeur: value, // Garder l'objet { value, unit } tel quel
            confiance: confidence || 0,
            raison: justification || "Non trouvé",
          }
        } else {
          result.champs_personnalises[name] = {
            valeur: value || "Non spécifié",
            confiance: confidence || 0,
            raison: justification || "Non trouvé",
          }
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
        prompt: prompt, // Prompt complet pour les traces
        fileName: file.name,
      },
      output: parsedData,
      timestamp: new Date().toISOString(),
      duration,
    }

    console.log(`[${agentName}] Analyse terminée en ${duration}ms`)
    console.log(`[${agentName}] Prompt length: ${prompt.length} caractères`)
    console.log(`[${agentName}] Prompt (premiers 200 chars): ${prompt.substring(0, 200)}...`)

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
    // Extraire la partie "Extrais les informations suivantes" du prompt principal
    const extractFieldsPart = (prompt: string): string => {
      const fieldsMatch = prompt.match(/Extrais les informations suivantes:([\s\S]*?)(?=IMPORTANT|$)/)
      if (fieldsMatch) {
        return fieldsMatch[1].trim()
      }
      // Fallback: extraire depuis le profil si disponible
      return "Extrais les informations du plan technique"
    }

    const fieldsPart = extractFieldsPart(prompt)
    
    const verifierPrompt = `Analyse l'IMAGE du document.

${fieldsPart}

IMPORTANT: Tu dois repondre UNIQUEMENT avec un tableau JSON d'objets. Chaque objet doit avoir les cles suivantes:
- "name": le nom exact du champ (doit correspondre exactement aux noms des champs ci-dessus)
- "data_type": le type de donnees ("string", "number", "boolean", "array", "object", etc.)
- "value": la valeur extraite (peut etre une string, un nombre, un objet, ou un tableau selon le type du champ)
- "confidence": un score de confiance entre 0 et 100
- "justification": l'explication de comment la valeur a ete obtenue

CRITIQUE - NOMS DES PROPRIETES:
Pour les champs de type "object" ou "array", tu dois utiliser EXACTEMENT les noms de proprietes montres dans les exemples du prompt principal.
Les noms de proprietes sont SANS ACCENTS et en minuscules (ex: "quantite" et NON "quantité", "diametre" et NON "diamètre").
Ne traduis PAS et n'invente PAS de noms de proprietes differents. Utilise uniquement ceux specifies dans les exemples du prompt principal.

IMPORTANT: Tu dois extraire UNIQUEMENT les champs listes ci-dessus. N'extrais aucun autre champ qui n'est pas dans cette liste.

Ne jamais inventer d information si elle n est pas visible. Toujours expliquer comment chaque valeur a ete trouvee. Si une unite est implicite, tu peux la deduire mais avec prudence. Utilise ton jugement d expert pour identifier des procedes ou types standards. Tu dois rendre la sortie exploitable automatiquement: pas de texte hors JSON. En cas de doute: si une valeur est manquante ou illisible, utilise value: "Non specifie" avec confidence: 0 et une justification claire.`

    const { data: verifierData, trace: verifierTrace, fileUrl: verifierFileUrl } = await callGeminiAgent(
      file,
      verifierPrompt,
      "Agent Vérificateur",
    )
    allTraces.push(verifierTrace)

    // ============================================
    // AGENT 3: COMPILATEUR FINAL
    // ============================================
    const compilerPrompt = `Fusionne ces 2 analyses JSON d'un plan technique:
1. Analyse Agent Principal: \`\`\`json
${JSON.stringify(principalData, null, 2)}
\`\`\`
2. Analyse Agent Verificateur: \`\`\`json
${JSON.stringify(verifierData, null, 2)}
\`\`\`

TA MISSION: Fusionne, resous les conflits, et valide. Produis un JSON final propre. Le JSON doit etre un tableau d'objets, chaque objet ayant les cles "name", "data_type", "value", "confidence" (un nombre de 0 a 100), et "justification".

Regles de fusion:
1. Pour chaque champ, choisis la valeur la plus fiable (confiance la plus elevee)
2. Si les deux agents sont d'accord, augmente la confiance
3. Si les agents divergent, choisis la valeur la plus logique et documente dans la justification
4. Combine les informations complementaires des deux analyses
5. Assure que tous les champs requis sont presents

IMPORTANT: Reponds UNIQUEMENT avec un tableau JSON d'objets. Chaque objet doit avoir les cles suivantes:
- "name": le nom exact du champ (doit correspondre exactement aux noms des champs dans les analyses)
- "data_type": le type de donnees ("string", "number", "boolean", "array", "object", etc.)
- "value": la valeur extraite (peut etre une string, un nombre, un objet, ou un tableau selon le type du champ)
- "confidence": un score de confiance entre 0 et 100
- "justification": l'explication de comment la valeur a ete obtenue (mentionne si elle vient de l'agent 1, 2, ou d'une fusion)

CRITIQUE - NOMS DES PROPRIETES:
Pour les champs de type "object" ou "array", tu dois utiliser EXACTEMENT les noms de proprietes qui apparaissent dans les analyses des agents 1 et 2.
Les noms de proprietes sont SANS ACCENTS et en minuscules (ex: "quantite" et NON "quantité", "diametre" et NON "diamètre").
Ne traduis PAS et n'invente PAS de noms de proprietes differents. Preserve les noms de proprietes exactement comme ils apparaissent dans les donnees sources.
Si les deux agents utilisent des noms differents, choisis celui qui est SANS ACCENTS et en minuscules.

Ne retourne QUE le JSON, sans texte supplementaire, sans markdown, sans code blocks.`

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
