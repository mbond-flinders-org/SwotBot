import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "SwotBot — AI Study Quiz",
  description: "Paste your notes, get a quiz, ace the exam!",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-cream min-h-screen font-sans text-gray-800 antialiased">
        {children}
      </body>
    </html>
  )
}
