type LoginPayload = {
  identifier: string;
  password: string;
};

type SignupPayload = {
  full_name: string;
  username: string;
  email: string;
  password: string;
  phone?: string;
};

async function handleJsonResponse(response: Response) {
  const contentType = response.headers.get("content-type");

  const data =
    contentType?.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    let message = "Something went wrong. Please try again.";

    if (data?.error) {
      message = data.error;
    }

    if (data?.details?.fieldErrors) {
      const fieldErrors = Object.values(data.details.fieldErrors)
        .flat()
        .filter(Boolean);

      if (fieldErrors.length > 0) {
        message = String(fieldErrors[0]);
      }
    }

    throw new Error(message);
  }

  return data;
}

export async function loginUser(payload: LoginPayload) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  return handleJsonResponse(response);
}

export async function signupUser(payload: SignupPayload) {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  return handleJsonResponse(response);
}

export async function logoutUser() {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });

  return handleJsonResponse(response);
}