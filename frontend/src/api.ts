const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// PRODUCT TYPES

export type Product = {
  id: string;
  name: string;
  brand: string;
  price: number | null;
  category: string;
  unit: string;
  emoji: string;
  color: string;
  ingredients: string[];
  ingredients_text: string;
  diet: string[];
  protein: number | null;
  sugar: number | null;
  calories: number | null;
  image: string | null;
  badge: string | null;
};

export type ProductFilters = {
  search?: string;
  max_price?: number;
  min_protein?: number;
  max_sugar?: number;
  include?: string[];
  exclude?: string[];
  diet?: string;
};

// AUTH TYPES

export type User = {
  id: number;
  name: string;
  email: string;
};

type TokenResponse = {
  access_token: string;
  token_type: string;
};

const TOKEN_KEY = "freshfilter_token";

// HELPER

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || `Request failed: ${response.status}`
    );
  }

  return data as T;
}

// REGISTER

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<User> {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, email, password }),
  });

  return handleResponse<User>(response);
}

// LOGIN

export async function loginUser(
  email: string,
  password: string
): Promise<User> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await handleResponse<TokenResponse>(response);

  sessionStorage.setItem(TOKEN_KEY, data.access_token);

  return getCurrentUser();
}
// GOOGLE LOGIN

export async function googleLoginUser(
  credential: string
): Promise<User> {
  const response = await fetch(`${API_URL}/api/auth/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ credential }),
  });

  const data = await handleResponse<TokenResponse>(response);

  sessionStorage.setItem(TOKEN_KEY, data.access_token);

  return getCurrentUser();
}

// GET CURRENT USER

export async function getCurrentUser(): Promise<User> {
  const token = sessionStorage.getItem(TOKEN_KEY);

  if (!token) {
    throw new Error("Please login first");
  }

  const response = await fetch(`${API_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<User>(response);
}

// LOGOUT

export function logoutUser(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

// PRODUCT API

export async function fetchProducts(
  filters: ProductFilters = {}
): Promise<Product[]> {
  const params = new URLSearchParams();

  if (filters.search) {
    params.set("search", filters.search);
  }

  if (filters.max_price !== undefined) {
    params.set("max_price", String(filters.max_price));
  }

  if (filters.min_protein !== undefined) {
    params.set("min_protein", String(filters.min_protein));
  }

  if (filters.max_sugar !== undefined) {
    params.set("max_sugar", String(filters.max_sugar));
  }

  if (filters.include?.length) {
    params.set("include", filters.include.join(","));
  }

  if (filters.exclude?.length) {
    params.set("exclude", filters.exclude.join(","));
  }

  if (filters.diet) {
    params.set("diet", filters.diet);
  }

  const response = await fetch(
    `${API_URL}/api/products?${params.toString()}`
  );

  const data = await handleResponse<{
    count: number;
    items: Product[];
  }>(response);

  return data.items;
}
// FAVORITES API

export type Favorite = {
  product_id: string;
  product_name: string;
};

export async function fetchFavorites(): Promise<Favorite[]> {
  const token = sessionStorage.getItem("freshfilter_token");

  const response = await fetch(`${API_URL}/api/favorites`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse<Favorite[]>(response);
}

export async function addFavorite(
  productId: string,
  productName: string
): Promise<void> {
  const token = sessionStorage.getItem("freshfilter_token");

  const params = new URLSearchParams({
    product_id: productId,
    product_name: productName,
  });

  const response = await fetch(
    `${API_URL}/api/favorites?${params.toString()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  await handleResponse<{ message: string }>(response);
}

export async function removeFavorite(productId: string): Promise<void> {
  const token = sessionStorage.getItem("freshfilter_token");

  const response = await fetch(
    `${API_URL}/api/favorites/${encodeURIComponent(productId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  await handleResponse<{ message: string }>(response);
}
export type ShoppingItem = {
  id: number;
  product_id: string;
  product_name: string;
  quantity: number;
  is_checked: boolean;
};

export async function fetchShoppingList(): Promise<ShoppingItem[]> {
  const token = sessionStorage.getItem("freshfilter_token");

  const response = await fetch(`${API_URL}/api/shopping-list`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return handleResponse<ShoppingItem[]>(response);
}

export async function addShoppingItem(
  productId: string,
  productName: string
): Promise<void> {
  const token = sessionStorage.getItem("freshfilter_token");

  const params = new URLSearchParams({
    product_id: productId,
    product_name: productName,
  });

  const response = await fetch(
    `${API_URL}/api/shopping-list?${params}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  await handleResponse(response);
}

export async function updateShoppingItem(
  itemId: number,
  updates: { quantity?: number; is_checked?: boolean }
): Promise<void> {
  const token = sessionStorage.getItem("freshfilter_token");
  const params = new URLSearchParams();

  if (updates.quantity !== undefined) {
    params.set("quantity", String(updates.quantity));
  }

  if (updates.is_checked !== undefined) {
    params.set("is_checked", String(updates.is_checked));
  }

  const response = await fetch(
    `${API_URL}/api/shopping-list/${itemId}?${params}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  await handleResponse(response);
}

export async function deleteShoppingItem(itemId: number): Promise<void> {
  const token = sessionStorage.getItem("freshfilter_token");

  const response = await fetch(
    `${API_URL}/api/shopping-list/${itemId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  await handleResponse(response);
}