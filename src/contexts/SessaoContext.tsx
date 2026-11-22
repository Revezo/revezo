/**
 * Sessão do usuário compartilhada pelo app inteiro.
 *
 * Escuta o Firebase Auth e carrega o perfil uma única vez, no layout raiz.
 * Assim as telas não precisam refazer essa busca (e mostrar carregamento)
 * toda vez que são abertas.
 */

import { onAuthStateChanged, User } from 'firebase/auth';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { auth } from '@/firebaseConfig';
import { carregarPerfil, PerfilUsuario } from '@/services/moradia';

interface SessaoContextValue {
  usuario: User | null;
  perfil: PerfilUsuario | null;
  /** `true` apenas até a primeira resposta do Firebase Auth + perfil. */
  carregando: boolean;
  /** Busca o perfil novamente (ex.: após entrar, criar ou trocar de moradia). */
  recarregarPerfil: () => Promise<PerfilUsuario | null>;
}

const SessaoContext = createContext<SessaoContextValue | null>(null);

async function buscarPerfilSeguro(usuario: User | null): Promise<PerfilUsuario | null> {
  if (!usuario) return null;
  try {
    return await carregarPerfil(usuario);
  } catch {
    return null;
  }
}

export function SessaoProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Evita que uma resposta antiga sobrescreva uma mais nova (ex.: logout durante o carregamento)
  const ultimaRequisicao = useRef(0);

  const aplicarPerfilDe = useCallback(async (atual: User | null) => {
    const requisicao = ++ultimaRequisicao.current;
    const p = await buscarPerfilSeguro(atual);
    if (requisicao === ultimaRequisicao.current) setPerfil(p);
    return p;
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (atual) => {
      setUsuario(atual);
      await aplicarPerfilDe(atual);
      setCarregando(false);
    });
  }, [aplicarPerfilDe]);

  const recarregarPerfil = useCallback(() => aplicarPerfilDe(auth.currentUser), [aplicarPerfilDe]);

  const valor = useMemo(
    () => ({ usuario, perfil, carregando, recarregarPerfil }),
    [usuario, perfil, carregando, recarregarPerfil],
  );

  return <SessaoContext.Provider value={valor}>{children}</SessaoContext.Provider>;
}

export function useSessao(): SessaoContextValue {
  const contexto = useContext(SessaoContext);
  if (!contexto) throw new Error('useSessao deve ser usado dentro de <SessaoProvider>.');
  return contexto;
}
