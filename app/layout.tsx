import type { Metadata } from "next";
import "./globals.css";
import "./stitch.css";
import "./login.css";
export const metadata: Metadata = {title:"Agronorte | Central de Marketing", description:"Agenda, demandas, conteúdo e resultados em um só lugar.", icons:{icon:{url:"/favicon.svg",type:"image/svg+xml"}}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="pt-BR"><body>{children}</body></html>;}
