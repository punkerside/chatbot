import { LoginForm } from "@/components/login-form"
import { NewPasswordForm } from "@/components/new-password-form"
import { useAuth } from "@/contexts/AuthContext"

export default function LoginPage() {
  const { needsNewPassword } = useAuth()
  
  if (needsNewPassword) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <NewPasswordForm />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}