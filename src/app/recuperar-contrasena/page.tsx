import { ForgotPasswordForm } from "@/components/forms/auth-forms";

type SearchParams = {
  token?: string;
};

export default async function RecuperarContrasenaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  return (
    <div className="px-4 py-12 md:px-6">
      <ForgotPasswordForm token={params.token} />
    </div>
  );
}
