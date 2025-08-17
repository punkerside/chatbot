import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { LoginForm } from "@/components/login-form"
import { NewPasswordForm } from "@/components/new-password-form"

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-3xl font-bold text-center mb-8">ChatBot</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-center text-gray-600">
            Welcome {user.username}! ChatBot Platform Ready.
          </p>
        </div>
      </div>
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
