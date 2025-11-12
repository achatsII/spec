/**
 * Helper functions pour l'API Gateway
 * Base URL: https://qa.gateway.intelligenceindustrielle.com
 */

const GATEWAY_BASE_URL = "https://qa.gateway.intelligenceindustrielle.com"

/**
 * Récupère les headers d'authentification pour les requêtes Gateway
 */
export function getAuthHeaders(): Record<string, string> {
  const token = process.env.NEXT_PUBLIC_BEARER_TOKEN
  if (!token) {
    console.warn("NEXT_PUBLIC_BEARER_TOKEN not configured - requests to gateway will likely fail")
    return {
      "Content-Type": "application/json",
    }
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}

/**
 * Récupère les headers pour les requêtes multipart/form-data
 */
export function getAuthHeadersMultipart(): Record<string, string> {
  const token = process.env.NEXT_PUBLIC_BEARER_TOKEN
  if (!token) {
    console.warn("NEXT_PUBLIC_BEARER_TOKEN not configured - requests to gateway will likely fail")
    return {}
  }
  return {
    Authorization: `Bearer ${token}`,
  }
}

/**
 * Construit l'URL complète pour un endpoint Gateway
 */
export function getGatewayUrl(endpoint: string): string {
  return `${GATEWAY_BASE_URL}${endpoint}`
}

/**
 * Appelle la Gateway avec gestion d'erreurs
 * Suit exactement le pattern de l'exemple qui fonctionne
 */
export async function callGateway(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const url = getGatewayUrl(endpoint)
  const headers = getAuthHeaders()

  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Impossible de lire le body")
    throw new Error(`Gateway API Error ${response.status}: ${errorText.substring(0, 500)}`)
  }

  return response
}

/**
 * Appelle la Gateway avec FormData (multipart/form-data)
 * Utilisé pour les uploads de fichiers
 */
export async function callGatewayMultipart(
  endpoint: string,
  formData: FormData,
  options: RequestInit = {},
): Promise<Response> {
  const url = getGatewayUrl(endpoint)
  const headers = getAuthHeadersMultipart()

  const response = await fetch(url, {
    method: options.method || "POST",
    headers,
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Impossible de lire le body")
    throw new Error(`Gateway API Error ${response.status}: ${errorText.substring(0, 500)}`)
  }

  return response
}

