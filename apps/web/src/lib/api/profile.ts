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

export async function getProfile() {
  const response = await fetch("/api/profile", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  return handleJsonResponse(response);
}

export async function updateProfile(payload: {
  full_name: string;
  email: string;
  phone?: string;
}) {
  const response = await fetch("/api/profile", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  return handleJsonResponse(response);
}

export async function changePassword(payload: {
  current_password: string;
  new_password: string;
  confirm_password: string;
}) {
  const response = await fetch("/api/profile/password", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  return handleJsonResponse(response);
}