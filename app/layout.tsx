import type React from "react"
import type { Metadata } from "next"

import "./globals.css"
import { Inter, Source_Serif_4 as V0_Font_Source_Serif_4 } from 'next/font/google'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'

// Initialize fonts - using the Geist package exports
const _geist = GeistSans
const _geistMono = GeistMono

const _sourceSerif_4 = V0_Font_Source_Serif_4({ subsets: ['latin'], weight: ["200","300","400","500","600","700","800","900"], variable: '--v0-font-source-serif-4' })
const _v0_fontVariables = `${_geist.variable} ${_geistMono.variable} ${_sourceSerif_4.variable}`

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "InPlan - Pipeline d'analyse | Intelligence Industrielle",
  description:
    "Solution d'analyse automatique de dessins techniques avec estimation de coûts et optimisation de matériaux",
  keywords: "analyse, dessins techniques, estimation, coûts, matériaux, intelligence industrielle",
  authors: [{ name: "Intelligence Industrielle" }],
  viewport: "width=device-width, initial-scale=1",
  robots: "noindex, nofollow", // Pour la version de développement
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <head>
        {/* Preload du logo pour une meilleure performance */}
        <link
          rel="preload"
          href="https://cdn.prod.website-files.com/661e90e3758529bd15e6c71f/68377030906f9e242965bc39_logo%20light%20version.svg"
          as="image"
        />
      </head>
      <body className={inter.className + " " + _v0_fontVariables}>{children}</body>
    </html>
  )
}
