import './globals.css';
import type { ReactNode } from 'react';
export const metadata = { title: 'AI Video Studio', description: 'Mobile-first 20-second film studio with scene planning, clip imports and video export' };
export default function RootLayout({children}:{children:ReactNode}) {return <html lang="en"><body style={{margin:0,background:'#0b1020',color:'#f8fafc',fontFamily:'Arial,sans-serif'}}>{children}</body></html>}
