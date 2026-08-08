import type { JWTPayload, User } from "../types/auth-types";

const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64Decode(input: string): string {
  let str = input.replace(/-/g, "+").replace(/_/g, "/");
  
  const pad = str.length % 4;
  if (pad) {
    str += "=".repeat(4 - pad);
  }

  let output = "";
  let buffer = 0;
  let bits = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === "=") break;

    const index = base64Chars.indexOf(char);
    if (index === -1) continue;

    buffer = (buffer << 6) | index;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  return output;
}

function decodeBase64Url(base64Url: string): string {
  const decoded = base64Decode(base64Url);
  
  try {
    return decodeURIComponent(
      decoded
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch {
    return decoded;
  }
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const jsonPayload = decodeBase64Url(payload);

    return JSON.parse(jsonPayload) as JWTPayload;
  } catch {
    return null;
  }
}

export function isTokenValid(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload) {
    return false;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp > currentTime;
}

export function getUserFromToken(token: string): User | null {
  const payload = decodeToken(token);
  if (!payload) {
    return null;
  }

  const nameIdentifier =
    payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
  const email =
    payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"];
  const username =
    payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
  const firstName = payload.firstName;
  const lastName = payload.lastName;
  const role =
    payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];

  const id = parseInt(nameIdentifier, 10);
  if (isNaN(id)) {
    return null;
  }

  let name = "";
  if (firstName && lastName) {
    name = `${firstName} ${lastName}`;
  } else if (firstName) {
    name = firstName;
  } else if (lastName) {
    name = lastName;
  } else if (username) {
    name = username;
  }

  return {
    id,
    email: email || "",
    name,
    role,
  };
}

export function getTokenExpiration(token: string): Date | null {
  const payload = decodeToken(token);
  if (!payload) {
    return null;
  }

  return new Date(payload.exp * 1000);
}
