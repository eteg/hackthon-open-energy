"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_PERFIL, PERFIS, ehPerfil } from "@/lib/perfil";

/** Chamada pelos botões da home: guarda o perfil escolhido e abre a primeira tela dele. */
export async function escolherPerfil(formData: FormData) {
  const perfil = formData.get("perfil");
  if (!ehPerfil(perfil)) redirect("/");

  (await cookies()).set(COOKIE_PERFIL, perfil, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  redirect(PERFIS[perfil].destino);
}
