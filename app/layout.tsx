import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title:"Agronorte | Central de Marketing", description:"Agenda, demandas, conteúdo e resultados em um só lugar."};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="pt-BR"><body>{children}</body></html>;}
