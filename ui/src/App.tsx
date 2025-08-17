import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { LoginForm } from "@/components/login-form"
import { NewPasswordForm } from "@/components/new-password-form"
import Chat from "@/components/chat"

function AppContent() {
  const { user, loading, needsNewPassword } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  if (needsNewPassword) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <NewPasswordForm />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background">
      <Chat />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
