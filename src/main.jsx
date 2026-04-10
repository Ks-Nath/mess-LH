import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { HostelProvider } from './context/HostelContext'
import { LeaveProvider } from './context/LeaveContext'
import { StudentProvider } from './context/StudentContext'
import { EstablishmentProvider } from './context/EstablishmentContext'
import './index.css'
import App from './App'

import { MenuProvider } from './context/MenuContext'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <HostelProvider>
                    <StudentProvider>
                        <LeaveProvider>
                            <EstablishmentProvider>
                                <MenuProvider>
                                    <App />
                                </MenuProvider>
                            </EstablishmentProvider>
                        </LeaveProvider>
                    </StudentProvider>
                </HostelProvider>
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>,
)

