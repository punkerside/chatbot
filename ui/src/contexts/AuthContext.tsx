import { createContext, useContext, useEffect, useState } from 'react'
import { getCurrentUser, signIn, signOut, confirmSignIn, fetchAuthSession, type AuthUser } from 'aws-amplify/auth'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  needsNewPassword: boolean
  login: (username: string, password: string) => Promise<void>
  confirmNewPassword: (newPassword: string) => Promise<void>
  logout: () => Promise<void>
  getToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsNewPassword, setNeedsNewPassword] = useState(false)

  useEffect(() => {
    checkAuthState()
  }, [])

  const checkAuthState = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      setNeedsNewPassword(false)
    } catch (error) {
      setUser(null)
      setNeedsNewPassword(false)
    } finally {
      setLoading(false)
    }
  }

  const login = async (username: string, password: string) => {
    try {
      const result = await signIn({ username, password })
      
      if (result.isSignedIn) {
        await checkAuthState()
      } else if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        setNeedsNewPassword(true)
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const confirmNewPassword = async (newPassword: string) => {
    try {
      const result = await confirmSignIn({ challengeResponse: newPassword })
      
      if (result.isSignedIn) {
        setNeedsNewPassword(false)
        await checkAuthState()
      }
    } catch (error) {
      console.error('New password error:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOut()
      setUser(null)
      setNeedsNewPassword(false)
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }

  const getToken = async (): Promise<string | null> => {
    try {
      const session = await fetchAuthSession()
      return session.tokens?.idToken?.toString() || null
    } catch (error) {
      console.error('Token error:', error)
      return null
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, needsNewPassword, login, confirmNewPassword, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}