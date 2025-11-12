"use client"

import { useState } from "react"

interface HeaderLogoProps {
  className?: string
}

export default function HeaderLogo({ className = "h-16 w-auto" }: HeaderLogoProps) {
  const [logoError, setLogoError] = useState(false)

  const handleLogoError = () => {
    setLogoError(true)
  }

  if (logoError) {
    // Fallback logo si l'image ne charge pas
    return (
      <div className="h-16 w-16 bg-[#0078FF] rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-xl">II</span>
      </div>
    )
  }

  return (
    <img
      src="https://cdn.prod.website-files.com/661e90e3758529bd15e6c71f/68377030906f9e242965bc39_logo%20light%20version.svg"
      alt="Intelligence Industrielle"
      className={className}
      onError={handleLogoError}
      loading="eager"
    />
  )
}
