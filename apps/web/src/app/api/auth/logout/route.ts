export async function POST() {
  const response = Response.json({ message: "Logout successful" });

  response.headers.append(
    "Set-Cookie",
    "auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax"
  );

  return response;
}