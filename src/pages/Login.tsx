import { LoginForm } from "@components/login-form"
import { AuthLayout } from "@components/auth-layout"

export default function Login() {
  return (
    <AuthLayout
      heroBadge="SMARTHIRE MISSION"
      heroWords={["Connect", "Discover", "Grow"]}
      heroDescription="Intelligent matching for teams that value fit, clarity, and long-term success."
    >
      <LoginForm />
    </AuthLayout>
  );
}
