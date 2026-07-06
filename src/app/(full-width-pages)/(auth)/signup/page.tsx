import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up | Richz-Log",
  description: "Create your Richz-Log account",
  // other metadata
};

export default function SignUp() {
  return <SignUpForm />;
}
