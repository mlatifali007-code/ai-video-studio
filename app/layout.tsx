import type { ReactNode } from 'react';
export const metadata = { title: 'AI Video Studio', description: 'Storyboard and scene planner' };
export default function RootLayout({children}:{children:ReactNode}) {return <html lang="en"><body style={{margin:0,background:'#0b1020',color:'#f8fafc',fontFamily:'Arial,sans-serif'}}>{children}</body></html>}
