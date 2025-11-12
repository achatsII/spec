# InPlan - Pipeline d'Analyse de Dessins Techniques
## Documentation Complète des Fonctionnalités

**Version:** 0.0.1  
**Entreprise:** Intelligence Industrielle  
**Date:** 2025

---

## 1. VUE D'ENSEMBLE

### 1.1 Objectif de l'Application
InPlan est une solution d'analyse automatique de dessins techniques qui permet d'extraire des informations structurées à partir de plans techniques (PDF, images) et de calculer automatiquement des estimations de coûts et d'optimisation de matériaux pour la fabrication.

### 1.2 Flux de Travail Principal
\`\`\`
1. Configuration Client → 2. Upload Plan → 3. Analyse IA → 4. Validation/Édition → 5. Calculs → 6. Résultats
\`\`\`

### 1.3 Architecture Technique
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS, shadcn/ui
- **Calculs:** mathjs pour l'évaluation d'expressions mathématiques
- **APIs Externes:** 
  - n8n webhook pour l'analyse IA (Gemini)
  - n8n webhook pour le stockage des profils clients
- **Stockage:** API externe via webhooks n8n

---

## 2. FONCTIONNALITÉS DÉTAILLÉES

### 2.1 GESTION DES PROFILS CLIENTS

#### 2.1.1 Concept
Un profil client représente une configuration spécifique contenant:
- Une liste de matériaux disponibles avec leurs caractéristiques
- Des formules de calcul personnalisées pour l'estimation

#### 2.1.2 Structure de Données d'un Profil Client

\`\`\`typescript
interface ClientProfile {
  id: string                    // Identifiant unique
  name: string                  // Nom du profil (ex: "ACME Manufacturing")
  materials: Material[]         // Liste des matériaux disponibles
  formulas: Formula[]           // Liste des formules de calcul
}

interface Material {
  id: string                    // Identifiant unique du matériau
  type: string                  // Type de matériau (ex: "Tube carré acier")
  dimensions: string            // Dimensions (ex: "1.5x1.5x0.1")
  standardLength: number        // Longueur standard de la barre (ex: 288)
  unit: string                  // Unité de mesure (ex: "mm", "pouces")
  costPerUnit: number           // Coût par unité (ex: 45.50)
}

interface Formula {
  id: string                    // Identifiant unique de la formule
  name: string                  // Nom descriptif (ex: "Calcul découpe laser")
  condition: string             // Condition d'application (expression booléenne)
  formula: string               // Formule mathématique à évaluer
  description: string           // Description de la formule
}
\`\`\`

#### 2.1.3 Opérations CRUD sur les Profils

**A. Création d'un Profil**
- L'utilisateur clique sur le bouton "+" dans la section Configuration Client
- Un modal s'ouvre avec un formulaire vide
- Champs obligatoires: Nom du profil
- Champs optionnels: Matériaux, Formules
- Génération automatique d'un ID unique basé sur timestamp
- Sauvegarde via API POST vers n8n webhook
- Payload envoyé:
  \`\`\`json
  {
    "action": "POST",
    "software_id": "technical-drawing-analyzer",
    "data_type": "client-profile",
    "description": "Profil client: [nom]",
    "json_data": {
      "name": "...",
      "materials": [...],
      "formulas": [...]
    }
  }
  \`\`\`

**B. Lecture/Chargement des Profils**
- Au chargement de l'application, appel automatique GET
- Récupération de tous les profils via API GET
- Payload envoyé:
  \`\`\`json
  {
    "action": "GET_ALL",
    "software_id": "technical-drawing-analyzer",
    "data_type": "client-profile"
  }
  \`\`\`
- Transformation des données reçues en format ClientProfile
- Affichage dans un dropdown de sélection

**C. Modification d'un Profil**
- L'utilisateur clique sur l'icône "Edit" d'un profil sélectionné
- Le modal s'ouvre pré-rempli avec les données existantes
- Modification possible de tous les champs
- Sauvegarde via API PUT vers n8n webhook
- Payload envoyé:
  \`\`\`json
  {
    "action": "UPDATE",
    "record_id": "[id du profil]",
    "software_id": "technical-drawing-analyzer",
    "data_type": "client-profile",
    "description": "Profil client: [nom]",
    "json_data": {
      "name": "...",
      "materials": [...],
      "formulas": [...]
    }
  }
  \`\`\`

**D. Suppression d'un Profil**
- L'utilisateur clique sur l'icône "Trash" d'un profil sélectionné
- Confirmation demandée via dialog natif
- Suppression via API DELETE
- Payload envoyé:
  \`\`\`json
  {
    "action": "DELETE",
    "record_id": "[id du profil]"
  }
  \`\`\`
- Si le profil supprimé était sélectionné, désélection automatique

**E. Sélection d'un Profil**
- Dropdown permettant de choisir un profil parmi ceux disponibles
- Option "Aucun profil" disponible
- Affichage des détails du profil sélectionné:
  - Nom du profil
  - Nombre de matériaux configurés
  - Nombre de formules configurées
- Le profil sélectionné est requis pour lancer une analyse

#### 2.1.4 Gestion des Matériaux dans un Profil

**A. Ajout d'un Matériau**
- Bouton "Ajouter" dans la section Matériaux du modal
- Création d'un nouveau matériau vide avec ID unique
- Formulaire avec les champs:
  - Type (texte libre)
  - Dimensions (texte libre)
  - Longueur standard (nombre)
  - Unité (texte libre, défaut: "mm")
  - Coût par unité (nombre décimal)

**B. Modification d'un Matériau**
- Édition inline dans le formulaire
- Mise à jour en temps réel dans l'état local
- Sauvegarde lors de la sauvegarde du profil

**C. Suppression d'un Matériau**
- Bouton "Trash" sur chaque carte de matériau
- Suppression immédiate de la liste
- Sauvegarde lors de la sauvegarde du profil

#### 2.1.5 Gestion des Formules dans un Profil

**A. Structure d'une Formule**
Une formule permet de définir un calcul personnalisé qui s'applique sous certaines conditions.

**B. Champs d'une Formule**
- **Nom:** Identifiant descriptif de la formule
- **Condition:** Expression booléenne qui détermine quand la formule s'applique
  - Variables disponibles: `type_piece`, `materiau`, `procede`, `longueur_piece`, `longueur_barre`
  - Opérateurs: `==`, `!=`, `&&`, `||`
  - Exemple: `type_piece == 'tube' && procede == 'decoupe laser'`
- **Formule:** Expression mathématique à évaluer
  - Variables disponibles: `longueur_piece`, `longueur_barre`, `cout_materiau`
  - Fonctions mathjs disponibles: `floor()`, `ceil()`, `round()`, opérateurs arithmétiques
  - Exemple: `floor((longueur_barre - 12) / (longueur_piece + 0.25))`
- **Description:** Explication textuelle de la formule

**C. Évaluation des Conditions**
- Lors du calcul, chaque formule est testée
- Les variables sont remplacées par leurs valeurs réelles
- La condition est évaluée avec mathjs
- Si la condition est vraie, la formule est appliquée

**D. Évaluation des Formules**
- Remplacement des variables par leurs valeurs numériques
- Évaluation de l'expression avec mathjs
- Résultat utilisé pour calculer le nombre de pièces par barre

---

### 2.2 ANALYSE DE DESSINS TECHNIQUES

#### 2.2.1 Upload de Fichiers

**A. Formats Acceptés**
- PDF (.pdf)
- Images PNG (.png)
- Images JPEG (.jpg, .jpeg)
- Taille maximale: 15 MB

**B. Interface d'Upload**
- Zone de drag & drop avec bordure en pointillés
- Bouton "Sélectionner un fichier"
- Affichage du fichier sélectionné:
  - Icône de fichier
  - Nom du fichier
  - Taille en MB
- Bouton "Analyser le plan" (désactivé si pas de profil client sélectionné)

**C. Validation Pré-Analyse**
- Vérification qu'un profil client est sélectionné
- Message d'avertissement si pas de profil
- Désactivation du bouton d'analyse si conditions non remplies

#### 2.2.2 Processus d'Analyse IA

**A. Préparation de la Requête**
- Création d'un FormData avec:
  - Le fichier uploadé
  - Un prompt d'instruction détaillé pour l'IA

**B. Prompt d'Instruction**
Le prompt envoyé à l'IA Gemini est extrêmement détaillé et structuré:

\`\`\`
Tu es un ingénieur industriel spécialisé dans l'interprétation rigoureuse de plans techniques.

OBJECTIF:
Extraire des informations techniques précises, structurées et exploitables automatiquement 
à partir d'un dessin technique.

DONNÉES À EXTRAIRE:
- Toutes les informations nécessaires à l'estimation de prix
- Toutes les informations nécessaires à la fabrication d'une pièce

EXIGENCES:
- Données normalisées
- Données fiables
- Données structurées
- Données contextualisées
- Accompagnées d'un niveau de confiance (0-100)
- Accompagnées d'une justification

FORMAT DE RÉPONSE:
JSON structuré avec pour chaque champ:
{
  "valeur": "...",           // Valeur extraite ou déduite
  "confiance": 95,           // Score de 0 à 100
  "raison": "..."            // Explication de comment la valeur a été obtenue
}

STRUCTURE ATTENDUE:
{
  "reference_dessin": {
    "valeur": "...",
    "confiance": 95,
    "raison": "Présent dans le cartouche"
  },
  "description": {
    "valeur": "...",
    "confiance": 80,
    "raison": "Mention dans le cartouche ou texte descriptif"
  },
  "materiau": {
    "valeur": "...",
    "confiance": 100,
    "raison": "Indiqué dans la zone matériau"
  },
  "type_piece": {
    "valeur": "tube | plat | corniere | plaque | autre",
    "confiance": 90,
    "raison": "Déduit de la géométrie ou du texte"
  },
  "dimensions": {
    "longueur": {
      "valeur": "...",
      "unite": "mm | pouces | ...",
      "confiance": 95,
      "raison": "Cote visible sur le plan"
    },
    "largeur": {...},
    "hauteur": {...},
    "epaisseur": {...}
  },
  "procedes": [
    {
      "valeur": "decoupe laser | pliage | percage | taraudage | filetage | autre",
      "confiance": 90,
      "raison": "Indiqué dans la légende ou inféré du plan"
    }
  ],
  "notes_importantes": [
    {
      "contenu": "...",
      "confiance": 80,
      "raison": "Note visible sur le plan technique"
    }
  ]
}

RÈGLES STRICTES:
- Ne jamais inventer d'information si elle n'est pas visible
- Toujours expliquer comment chaque valeur a été trouvée
- Si une unité est implicite, la déduire avec prudence
- Utiliser le jugement d'expert pour identifier des procédés ou types standards
- Rendre la sortie exploitable automatiquement: pas de texte hors JSON
- En cas de doute: valeur "Non spécifié", confiance 0, raison claire
\`\`\`

**C. Appel API**
- Endpoint: `https://n8n.tools.intelligenceindustrielle.com/webhook/54563f03-935e-4865-aa4e-949632147de8`
- Méthode: POST
- Body: FormData avec:
  - `action`: "GEMINI_FILE_LIGHT"
  - `prompt`: Le prompt d'instruction
  - `file`: Le fichier uploadé

**D. Traitement de la Réponse**
- Réception de la réponse JSON de l'API
- Extraction du champ `results[0].gemini_response`
- Nettoyage de la réponse:
  - Suppression des balises markdown (```json, ```)
  - Trim des espaces
- Parsing JSON de la réponse nettoyée
- Gestion des erreurs de parsing avec données par défaut

**E. Transformation des Données**
Conversion de la réponse IA en structure `AnalysisResult`:

\`\`\`typescript
interface AnalysisResult {
  id: string                      // Timestamp unique
  fileName: string                // Nom du fichier analysé
  timestamp: Date                 // Date/heure de l'analyse
  rawData: any                    // Données brutes de l'IA
  extractedData: ExtractedData    // Données structurées
}

interface ExtractedData {
  reference: ExtractedField       // Référence du dessin
  description: ExtractedField     // Description de la pièce
  material: ExtractedField        // Matériau
  pieceType: ExtractedField       // Type de pièce (tube, plat, etc.)
  dimensions: {                   // Dimensions avec unités
    longueur?: DimensionField
    largeur?: DimensionField
    hauteur?: DimensionField
    épaisseur?: DimensionField
  }
  processes: ExtractedField[]     // Liste des procédés
  notes: Array<{                  // Notes importantes
    contenu: string
    confiance: number
    raison: string
  }>
}

interface ExtractedField {
  valeur: string                  // Valeur extraite
  confiance: number               // Score de confiance 0-100
  raison: string                  // Justification
}

interface DimensionField extends ExtractedField {
  unite: string                   // Unité de mesure
}
\`\`\`

**F. Gestion des Erreurs**
- Erreurs réseau: Message utilisateur "Problème de connexion réseau"
- Erreurs de parsing: Données par défaut avec confiance 0
- Erreurs API: Affichage du message d'erreur
- Logging console détaillé pour le débogage

#### 2.2.3 Affichage des Résultats d'Analyse

**A. Organisation Visuelle**
Les résultats sont affichés dans la colonne centrale "Données Extraites" sous forme de cartes regroupées par catégorie.

**B. Carte "Informations Générales"**
Affiche les champs de base:
- Référence du dessin
- Description
- Matériau
- Type de pièce

Pour chaque champ:
- Label du champ
- Badge de confiance coloré (vert ≥80%, jaune ≥60%, rouge <60%)
- Valeur extraite
- Raison/justification en texte grisé
- Bouton d'édition (icône crayon)

**C. Carte "Dimensions"**
Affiche uniquement les dimensions présentes:
- Longueur (si disponible)
- Largeur (si disponible)
- Hauteur (si disponible)
- Épaisseur (si disponible)

Format d'affichage: `[valeur] [unité]` avec badge de confiance

**D. Carte "Procédés"**
Liste des procédés de fabrication identifiés:
- Chaque procédé dans une ligne avec fond gris clair
- Nom du procédé
- Badge de confiance

**E. Carte "Notes Importantes"**
Liste des notes extraites du plan:
- Chaque note dans un bloc avec fond bleu clair
- Contenu de la note
- Raison de l'extraction
- Badge de confiance

**F. Métadonnées**
En haut des résultats:
- Nom du fichier analysé
- Date et heure de l'analyse (format localisé)

#### 2.2.4 Édition Manuelle des Résultats

**A. Activation du Mode Édition**
- Clic sur l'icône "Edit" à côté d'un champ
- Le champ passe en mode édition
- Affichage d'un input texte avec la valeur actuelle
- Boutons "Check" (valider) et "X" (annuler)

**B. Sauvegarde d'une Modification**
- Clic sur le bouton "Check"
- Mise à jour de la valeur dans l'état
- Mise à jour automatique de la confiance à 100%
- Mise à jour de la raison à "Modifié manuellement"
- Sortie du mode édition
- Propagation de la mise à jour au composant parent

**C. Annulation d'une Modification**
- Clic sur le bouton "X"
- Restauration de la valeur originale
- Sortie du mode édition

**D. Impact sur les Calculs**
- Les modifications manuelles sont immédiatement prises en compte
- Si des calculs ont déjà été effectués, ils doivent être relancés
- Les valeurs modifiées sont utilisées pour les nouveaux calculs

---

### 2.3 MOTEUR DE CALCUL

#### 2.3.1 Principe de Fonctionnement

Le moteur de calcul génère TOUTES les combinaisons possibles de calculs en testant:
- Chaque matériau compatible du profil client
- Chaque formule applicable du profil client
- Le calcul par défaut pour chaque matériau

**Objectif:** Fournir à l'utilisateur une vue exhaustive de toutes les options possibles pour choisir la meilleure.

#### 2.3.2 Détermination des Matériaux Compatibles

**A. Critères de Compatibilité**
Un matériau est considéré compatible si:
- Son type contient le type de pièce (ex: "tube" dans "Tube carré acier")
- OU son type contient le matériau extrait (ex: "acier" dans "Tube carré acier")
- OU correspondance spécifique: tube→tube, plat→plat
- OU matériaux génériques: contient "acier" ou "alu"

**B. Fallback**
Si aucun matériau n'est compatible selon les critères, TOUS les matériaux du profil sont utilisés.

**C. Exemple de Logique**
\`\`\`typescript
const pieceType = "tube"  // Extrait du plan
const material = "acier"  // Extrait du plan

// Matériau 1: "Tube carré acier 1.5x1.5" → Compatible (contient "tube" et "acier")
// Matériau 2: "Plat aluminium 2x0.5" → Non compatible
// Matériau 3: "Tube rond acier 2.0" → Compatible (contient "tube" et "acier")
\`\`\`

#### 2.3.3 Extraction des Variables

**A. Variables Extraites du Plan**
\`\`\`typescript
const variables = {
  longueur_piece: number,        // Longueur extraite des dimensions
  longueur_barre: number,        // Longueur standard du matériau
  type_piece: string,            // Type de pièce (tube, plat, etc.)
  materiau: string,              // Matériau (acier, alu, etc.)
  procedes: string[],            // Liste des procédés
  cout_materiau: number          // Coût par unité du matériau
}
\`\`\`

**B. Extraction de la Longueur de Pièce**
- Récupération de `dimensions.longueur.valeur`
- Nettoyage: suppression de tous les caractères non numériques sauf point et tiret
- Conversion en nombre avec `parseFloat()`
- Valeur par défaut: 0 si non disponible ou invalide

**C. Validation**
- Si `longueur_piece <= 0`, affichage d'une alerte et arrêt des calculs
- Message: "Attention: La longueur de la pièce n'est pas définie ou invalide."

#### 2.3.4 Évaluation des Formules

**A. Test de Chaque Formule**
Pour chaque formule du profil client:
1. Évaluation de la condition
2. Si condition vraie, application de la formule
3. Calcul du résultat

**B. Évaluation des Conditions**
\`\`\`typescript
// Exemple de condition: "type_piece == 'tube' && procede == 'decoupe laser'"

// Étape 1: Remplacement des variables
// type_piece → 'tube'
// procede → vérification dans le tableau procedes[]

// Étape 2: Gestion des types
// Strings: entourés de quotes simples
// Numbers: valeur directe
// Arrays: vérification d'inclusion

// Étape 3: Évaluation avec mathjs
const result = evaluate(conditionToEvaluate)  // true ou false
\`\`\`

**C. Évaluation des Formules**
\`\`\`typescript
// Exemple de formule: "floor((longueur_barre - 12) / (longueur_piece + 0.25))"

// Étape 1: Remplacement des variables numériques
// longueur_barre → 288
// longueur_piece → 50

// Résultat: "floor((288 - 12) / (50 + 0.25))"

// Étape 2: Évaluation avec mathjs
const piecesPerBar = evaluate(formulaToEvaluate)  // 5

// Étape 3: Sécurité
const safePiecesPerBar = Math.max(0, Math.floor(piecesPerBar))
\`\`\`

**D. Calcul du Coût**
\`\`\`typescript
const costPerPiece = piecesPerBar > 0 
  ? material.costPerUnit / piecesPerBar 
  : material.costPerUnit
\`\`\`

#### 2.3.5 Calcul par Défaut

**A. Formule Standard**
Si aucune formule personnalisée ne s'applique, ou en complément, un calcul par défaut est effectué:

\`\`\`typescript
const marge = 12              // Marge de sécurité en mm
const jeu = 0.25              // Jeu de coupe en mm

const piecesPerBar = Math.floor(
  (longueur_barre - marge) / (longueur_piece + jeu)
)
\`\`\`

**B. Paramètres**
- **Marge (12mm):** Espace réservé pour les chutes et imprécisions
- **Jeu (0.25mm):** Espace entre chaque pièce pour la coupe

**C. Exemple**
\`\`\`
Longueur barre: 288 mm
Longueur pièce: 50 mm
Marge: 12 mm
Jeu: 0.25 mm

Calcul: floor((288 - 12) / (50 + 0.25))
      = floor(276 / 50.25)
      = floor(5.49)
      = 5 pièces par barre
\`\`\`

#### 2.3.6 Génération de Tous les Résultats

**A. Structure d'un Résultat**
\`\`\`typescript
interface ExtendedCalculationResult {
  piecesPerBar: number              // Nombre de pièces par barre
  estimatedCost: number             // Coût estimé par pièce
  selectedMaterial: Material        // Matériau utilisé
  appliedFormula: Formula | null    // Formule appliquée (null si défaut)
  details: string                   // Description du calcul
  variables: Record<string, any>    // Variables utilisées
  materialId: string                // ID du matériau (pour clé unique)
  formulaId?: string                // ID de la formule (pour clé unique)
}
\`\`\`

**B. Processus de Génération**
\`\`\`
Pour chaque matériau compatible:
  1. Tester toutes les formules
     - Si condition vraie:
       - Appliquer la formule
       - Créer un résultat avec cette formule
  
  2. Calculer avec la formule par défaut
     - Créer un résultat "Calcul standard"
\`\`\`

**C. Exemple de Résultats Générés**
\`\`\`
Matériaux compatibles: 3
Formules applicables par matériau: 2, 1, 0

Résultats générés:
1. Matériau 1 + Formule 1 → 6 pièces, $7.58/pièce
2. Matériau 1 + Formule 2 → 5 pièces, $9.10/pièce
3. Matériau 1 + Défaut → 5 pièces, $9.10/pièce
4. Matériau 2 + Formule 1 → 7 pièces, $6.43/pièce
5. Matériau 2 + Défaut → 6 pièces, $7.50/pièce
6. Matériau 3 + Défaut → 4 pièces, $11.25/pièce

Total: 6 résultats
\`\`\`

#### 2.3.7 Tri et Sélection des Résultats

**A. Critères de Tri**
Les résultats sont triés par ordre de préférence:
1. **Priorité 1:** Nombre de pièces par barre (décroissant)
2. **Priorité 2:** Coût par pièce (croissant)

\`\`\`typescript
allResults.sort((a, b) => {
  if (b.piecesPerBar !== a.piecesPerBar) {
    return b.piecesPerBar - a.piecesPerBar  // Plus de pièces = mieux
  }
  return a.estimatedCost - b.estimatedCost  // Moins cher = mieux
})
\`\`\`

**B. Sélection Automatique**
- Le premier résultat après tri est automatiquement sélectionné
- C'est le résultat optimal selon les critères

**C. Exemple de Tri**
\`\`\`
Avant tri:
1. 5 pièces, $9.10
2. 6 pièces, $7.58
3. 6 pièces, $7.50
4. 4 pièces, $11.25

Après tri:
1. 6 pièces, $7.50  ← Sélectionné automatiquement
2. 6 pièces, $7.58
3. 5 pièces, $9.10
4. 4 pièces, $11.25
\`\`\`

#### 2.3.8 Affichage des Résultats

**A. Liste des Résultats**
Tous les résultats sont affichés sous forme de cartes cliquables:

**Contenu de chaque carte:**
- Type de matériau (tronqué si trop long)
- Dimensions et longueur standard
- Nombre de pièces par barre (grand, en bleu)
- Coût par pièce (formaté avec 2 décimales)
- Nom de la méthode (formule ou "Standard")

**Interaction:**
- Clic sur une carte pour la sélectionner
- Carte sélectionnée: bordure bleue, fond bleu clair, ombre
- Cartes non sélectionnées: bordure grise, hover avec bordure bleue claire

**B. Détail du Calcul Sélectionné**
Une carte détaillée affiche les informations du résultat sélectionné:

**Métriques Principales (3 colonnes):**
1. **Pièces/Barre:** Nombre de pièces (fond bleu clair)
2. **Coût/Pièce:** Coût unitaire (fond vert clair)
3. **Coût/Barre:** Coût total de la barre (fond violet clair)

**Détails (fond gris):**
- Matériau utilisé (tronqué si long, tooltip avec texte complet)
- Méthode appliquée (nom de la formule ou "Calcul standard")
- Détails du calcul (description)

**Section Bonus (si formule appliquée):**
- Nom de la formule
- Description de la formule
- Fond bleu clair

**C. Gestion du Texte Long**
- Fonction `truncateText()` pour limiter la longueur
- Attribut `title` pour afficher le texte complet au survol
- Classes CSS `truncate` et `break-words`

**D. Formatage des Nombres**
- Fonction `formatNumber()` adaptative:
  - Si nombre > 8 caractères: 1 décimale
  - Si nombre > 6 caractères: 2 décimales
  - Sinon: 2 décimales
- Préfixe "$" pour les montants

---

### 2.4 ÉTATS ET FLUX DE DONNÉES

#### 2.4.1 États Globaux de l'Application

\`\`\`typescript
// État dans le composant principal (page.tsx)
const [selectedProfile, setSelectedProfile] = useState<ClientProfile | null>(null)
const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null)
const [isAnalyzing, setIsAnalyzing] = useState(false)
const [isCalculating, setIsCalculating] = useState(false)
\`\`\`

#### 2.4.2 Flux de Données

**A. Sélection de Profil**
\`\`\`
ClientProfileSelector → onProfileSelect → setSelectedProfile → État global
                                                              ↓
                                                    FileUpload (props)
                                                    CalculationEngine (props)
\`\`\`

**B. Analyse de Fichier**
\`\`\`
FileUpload → analyzeFile() → API externe → onFileAnalyzed → setAnalysisResult
                                                           ↓
                                                  AnalysisResults (props)
                                                  CalculationEngine (props)
\`\`\`

**C. Édition de Résultats**
\`\`\`
AnalysisResults → saveEdit() → onResultUpdate → setAnalysisResult → État global
                                                                    ↓
                                                          CalculationEngine (props)
\`\`\`

**D. Calculs**
\`\`\`
CalculationEngine → performAllCalculations() → setAllCalculationResults
                                             → setSelectedResult
                                             → onCalculationComplete
                                             ↓
                                    setCalculationResult (état global)
\`\`\`

#### 2.4.3 Dépendances entre Composants

**Conditions d'Activation:**
- **Analyse:** Requiert un profil client sélectionné
- **Calculs:** Requiert un profil client ET un résultat d'analyse
- **Édition:** Requiert un résultat d'analyse

**Réinitialisation:**
- Changement de profil → Pas de réinitialisation automatique
- Nouvelle analyse → Réinitialisation des calculs
- Édition de résultats → Pas de réinitialisation automatique des calculs

---

### 2.5 GESTION DES ERREURS

#### 2.5.1 Erreurs de Chargement des Profils

**Types d'Erreurs:**
- Erreur réseau (fetch failed)
- Erreur HTTP (status !== 200)
- Erreur de format (réponse non-JSON)
- Erreur de parsing JSON

**Gestion:**
- Logging console détaillé
- Affichage d'un message d'erreur (si implémenté)
- Fallback: liste de profils vide
- Pas de blocage de l'application

#### 2.5.2 Erreurs d'Analyse

**Types d'Erreurs:**
- Erreur réseau
- Erreur API externe
- Erreur de parsing de la réponse IA
- Fichier invalide

**Gestion:**
- Affichage d'une alerte rouge avec le message d'erreur
- Logging console détaillé
- Arrêt du spinner de chargement
- Possibilité de réessayer

#### 2.5.3 Erreurs de Calcul

**Types d'Erreurs:**
- Longueur de pièce invalide
- Aucun matériau compatible
- Erreur d'évaluation de formule
- Erreur d'évaluation de condition

**Gestion:**
- Alertes utilisateur pour les erreurs critiques
- Warnings console pour les erreurs non-bloquantes
- Fallback sur calcul par défaut si formule échoue
- Continuation avec les résultats valides

#### 2.5.4 ErrorBoundary

**Implémentation:**
- Composant React ErrorBoundary pour capturer les erreurs
- Affichage d'une interface de secours
- Bouton de rechargement
- Logging des erreurs

---

### 2.6 OPTIMISATIONS ET PERFORMANCES

#### 2.6.1 Optimisations de Rendu

**A. Gestion des États**
- États locaux pour les interactions rapides (édition, modal)
- États globaux pour les données partagées
- Pas de re-render inutile grâce à la structure des props

**B. Mémoïsation**
- Utilisation de `useEffect` avec dépendances pour les calculs de compatibilité
- Éviter les recalculs inutiles

#### 2.6.2 Optimisations Réseau

**A. API Routes**
- Utilisation d'API routes Next.js pour éviter CORS
- Proxy vers les APIs externes
- Gestion centralisée des erreurs

**B. Validation Côté Client**
- Validation avant envoi pour réduire les appels inutiles
- Feedback immédiat à l'utilisateur

#### 2.6.3 Optimisations UI

**A. Responsive Design**
- Layout adaptatif: 1 colonne sur mobile, 3 colonnes sur desktop
- Tailles de police adaptatives
- Espacement optimisé

**B. Gestion du Texte Long**
- Troncature avec tooltips
- Éviter les débordements
- Breakpoints pour les mots longs

---

### 2.7 SÉCURITÉ

#### 2.7.1 Validation des Données

**A. Côté Client**
- Validation des types de fichiers
- Validation de la taille des fichiers
- Validation des champs obligatoires

**B. Côté Serveur (API Routes)**
- Vérification de la présence des données requises
- Validation du format JSON
- Gestion des erreurs de parsing

#### 2.7.2 Gestion des Secrets

**A. Variables d'Environnement**
- URLs des APIs externes stockées dans les variables d'environnement
- Pas de secrets exposés côté client
- API routes comme proxy sécurisé

#### 2.7.3 Sanitization

**A. Données Utilisateur**
- Trim des espaces pour les champs texte
- Validation des nombres
- Échappement des caractères spéciaux dans les formules

---

### 2.8 EXPÉRIENCE UTILISATEUR (UX)

#### 2.8.1 Feedback Visuel

**A. États de Chargement**
- Spinners pendant les opérations asynchrones
- Désactivation des boutons pendant le traitement
- Messages de statut ("Analyse en cours...", "Calcul en cours...")

**B. Indicateurs de Confiance**
- Badges colorés pour les scores de confiance
- Vert (≥80%): Haute confiance
- Jaune (≥60%): Confiance moyenne
- Rouge (<60%): Faible confiance

**C. États Vides**
- Messages explicatifs quand aucune donnée
- Icônes illustratives
- Instructions pour l'utilisateur

#### 2.8.2 Navigation et Workflow

**A. Flux Linéaire**
\`\`\`
Configuration → Upload → Analyse → Validation → Calculs → Résultats
\`\`\`

**B. Guidage Utilisateur**
- Messages d'avertissement si étapes manquantes
- Désactivation des actions non disponibles
- Feedback immédiat sur les actions

#### 2.8.3 Accessibilité

**A. Sémantique HTML**
- Utilisation de balises appropriées
- Labels pour les inputs
- Attributs ARIA si nécessaire

**B. Contraste et Lisibilité**
- Couleurs avec contraste suffisant
- Tailles de police lisibles
- Espacement généreux

**C. Interactions Clavier**
- Tous les éléments interactifs accessibles au clavier
- Focus visible
- Navigation logique

---

### 2.9 BRANDING ET DESIGN

#### 2.9.1 Identité Visuelle

**A. Couleurs**
- Couleur primaire: #0078FF (bleu InPlan)
- Couleurs secondaires: Gris, vert, violet pour les métriques
- Dégradé de fond: bleu clair

**B. Logo**
- Logo Intelligence Industrielle en header et footer
- URL: `https://cdn.prod.website-files.com/.../logo%20light%20version.svg`
- Fallback en cas d'erreur de chargement

**C. Typographie**
- Police principale: Inter (via next/font/google)
- Hiérarchie claire des titres
- Tailles adaptatives

#### 2.9.2 Layout

**A. Structure en 3 Colonnes**
1. **Gauche:** Configuration (profil + upload)
2. **Centre:** Résultats d'analyse
3. **Droite:** Calculs et estimations

**B. Header**
- Logo + séparateur + branding InPlan
- Description de l'application
- Badge de version

**C. Footer**
- Logo + copyright
- Version de l'application
- Informations légales

---

### 2.10 ÉVOLUTIONS FUTURES POSSIBLES

#### 2.10.1 Fonctionnalités Suggérées

**A. Persistance des Données**
- Sauvegarde des analyses dans la base de données
- Historique des analyses
- Export des résultats en PDF

**B. Collaboration**
- Partage de profils entre utilisateurs
- Commentaires sur les analyses
- Workflow d'approbation

**C. Optimisations Avancées**
- Suggestions automatiques de matériaux
- Optimisation multi-critères (coût, délai, qualité)
- Comparaison de scénarios

**D. Intégrations**
- Connexion avec ERP
- Import depuis CAO
- Export vers systèmes de production

**E. Intelligence Artificielle**
- Apprentissage des préférences utilisateur
- Amélioration continue du prompt IA
- Détection automatique d'anomalies

---

## 3. SPÉCIFICATIONS TECHNIQUES

### 3.1 Stack Technologique

**Frontend:**
- Next.js 16 (App Router)
- React 19.2
- TypeScript
- Tailwind CSS
- shadcn/ui components

**Bibliothèques:**
- mathjs: Évaluation d'expressions mathématiques
- lucide-react: Icônes
- next/font: Optimisation des polices

**APIs Externes:**
- n8n webhook (Gemini): Analyse IA des plans
- n8n webhook (Storage): Stockage des profils clients

### 3.2 Structure des Fichiers

\`\`\`
app/
├── page.tsx                          # Page principale
├── layout.tsx                        # Layout global
├── globals.css                       # Styles globaux
└── api/
    ├── analyze-file/
    │   └── route.ts                  # API route pour l'analyse
    └── client-profiles/
        ├── route.ts                  # GET et POST des profils
        └── [id]/
            └── route.ts              # PUT et DELETE d'un profil

components/
├── file-upload.tsx                   # Upload et analyse de fichiers
├── client-profile-selector.tsx       # Sélection de profils
├── client-profile-modal.tsx          # Modal de création/édition
├── analysis-results.tsx              # Affichage des résultats
├── calculation-engine.tsx            # Moteur de calcul
├── error-boundary.tsx                # Gestion des erreurs
└── ui/                               # Composants shadcn/ui

types/
└── analysis.ts                       # Définitions TypeScript
\`\`\`

### 3.3 APIs Externes

**A. API d'Analyse (Gemini)**
- URL: `https://n8n.tools.intelligenceindustrielle.com/webhook/54563f03-935e-4865-aa4e-949632147de8`
- Méthode: POST
- Body: FormData
  - action: "GEMINI_FILE_LIGHT"
  - prompt: string
  - file: File
- Réponse: JSON avec `results[0].gemini_response`

**B. API de Stockage (Profils)**
- URL: `https://n8n.tools.intelligenceindustrielle.com/webhook/6852d509-086a-4415-a48c-ca72e7ceedb3`
- Méthode: POST
- Body: JSON

**Actions disponibles:**
- GET_ALL: Récupérer tous les profils
- POST: Créer un nouveau profil
- UPDATE: Modifier un profil existant
- DELETE: Supprimer un profil

### 3.4 Modèle de Données

Voir section 2.1.2 pour les interfaces TypeScript complètes.

---

## 4. GUIDE DE REDÉVELOPPEMENT

### 4.1 Ordre de Développement Recommandé

1. **Setup du projet**
   - Initialiser Next.js 16 avec TypeScript
   - Installer les dépendances (Tailwind, shadcn/ui, mathjs)
   - Configurer les variables d'environnement

2. **Définir les types**
   - Créer `types/analysis.ts` avec toutes les interfaces

3. **Développer la gestion des profils**
   - API routes pour CRUD
   - Composant de sélection
   - Modal de création/édition

4. **Développer l'analyse de fichiers**
   - Composant d'upload
   - API route proxy
   - Traitement de la réponse IA

5. **Développer l'affichage des résultats**
   - Composant d'affichage
   - Système d'édition inline
   - Badges de confiance

6. **Développer le moteur de calcul**
   - Logique de compatibilité des matériaux
   - Évaluation des formules
   - Génération de tous les résultats
   - Tri et sélection

7. **Intégrer les composants**
   - Page principale avec layout 3 colonnes
   - Gestion des états globaux
   - Flux de données entre composants

8. **Polir l'UI/UX**
   - Responsive design
   - Feedback visuel
   - Gestion des erreurs
   - Branding

9. **Tests et optimisations**
   - Tests avec différents types de plans
   - Optimisation des performances
   - Gestion des cas limites

### 4.2 Points d'Attention Critiques

**A. Prompt IA**
Le prompt envoyé à l'IA est CRUCIAL pour la qualité des résultats. Il doit être:
- Extrêmement détaillé
- Structuré avec des exemples
- Explicite sur le format de sortie
- Clair sur les règles à suivre

**B. Évaluation des Formules**
- Utiliser mathjs pour l'évaluation sécurisée
- Gérer les erreurs d'évaluation
- Valider les résultats (pas de valeurs négatives)

**C. Gestion des États**
- Bien comprendre les dépendances entre composants
- Éviter les boucles infinies de re-render
- Propager correctement les mises à jour

**D. Responsive Design**
- Tester sur différentes tailles d'écran
- Gérer les débordements de texte
- Adapter les layouts

### 4.3 Pièges à Éviter

1. **Ne pas valider les données**
   - Toujours valider côté client ET serveur
   - Gérer les cas où les données sont manquantes

2. **Oublier la gestion des erreurs**
   - Chaque appel API doit avoir un try-catch
   - Afficher des messages d'erreur clairs

3. **Négliger l'UX**
   - Toujours donner du feedback à l'utilisateur
   - Désactiver les boutons pendant les opérations
   - Afficher des états de chargement

4. **Hardcoder les valeurs**
   - Utiliser des variables d'environnement
   - Rendre les paramètres configurables

5. **Ignorer les performances**
   - Optimiser les re-renders
   - Gérer les listes longues
   - Limiter les appels API

---

## 5. GLOSSAIRE

**Profil Client:** Configuration contenant les matériaux et formules d'un client spécifique

**Matériau:** Type de matière première avec ses caractéristiques (dimensions, coût, etc.)

**Formule:** Règle de calcul personnalisée avec une condition d'application

**Analyse:** Processus d'extraction d'informations d'un plan technique via IA

**Confiance:** Score de 0 à 100 indiquant la fiabilité d'une information extraite

**Calcul:** Processus d'estimation du nombre de pièces par barre et du coût

**Pièces par barre:** Nombre de pièces qu'on peut découper dans une barre standard

**Coût par pièce:** Prix unitaire d'une pièce en fonction du matériau et du rendement

**Compatibilité:** Adéquation entre un matériau et le type de pièce à fabriquer

**Procédé:** Opération de fabrication (découpe, pliage, perçage, etc.)

---

## 6. CONCLUSION

Cette documentation fournit une vue exhaustive de toutes les fonctionnalités de l'application InPlan. Elle permet à un développeur ou un agent IA de comprendre:

- **QUOI:** Toutes les fonctionnalités disponibles
- **COMMENT:** Le fonctionnement détaillé de chaque fonctionnalité
- **POURQUOI:** Les choix de conception et d'architecture
- **OÙ:** La structure du code et l'organisation des fichiers

L'application est conçue pour être:
- **Intuitive:** Flux de travail linéaire et guidé
- **Robuste:** Gestion complète des erreurs
- **Flexible:** Système de formules personnalisables
- **Performante:** Optimisations et calculs efficaces
- **Évolutive:** Architecture permettant l'ajout de fonctionnalités

Pour toute question ou clarification, se référer au code source ou aux commentaires inline.
