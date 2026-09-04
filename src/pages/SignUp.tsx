import { SignupForm } from "@components/signup-form"
import { AuthLayout } from "@components/auth-layout"

export default function SignUp() {
  return (
    <AuthLayout
      heroBadge="SMARTHIRE MISSION"
      heroWords={["Begin", "Build", "Belong"]}
      heroDescription="Intelligent matching for teams that value fit, clarity, and long-term success."
    >
      <SignupForm />
    </AuthLayout>
  );
}

