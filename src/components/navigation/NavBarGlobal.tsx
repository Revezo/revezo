/**
 * Nav-bar única do app, renderizada no layout raiz por cima de toda a navegação.
 *
 * Como ela nunca é desmontada, não some nem pisca quando uma tela é empilhada
 * (detalhes, histórico...) e a animação de troca de aba é sempre contínua.
 */

import { useSessao } from '@/contexts/SessaoContext';
import { router, usePathname, useSegments } from 'expo-router';
import React, { useState } from 'react';
import { BottomNavBar, BottomNavTab } from './BottomNavBar';
import { avisarAbaIndisponivel, ROTA_DA_ABA } from './navegacaoAbas';

/** Rotas das abas (grupo `(tabs)`). */
const ABA_POR_ROTA: Record<string, BottomNavTab> = {
  '/': 'home',
  '/ciclo': 'ciclo',
  '/ranking': 'ranking',
  '/perfil': 'perfil',
};

/** Telas empilhadas que também exibem a nav-bar, e a aba que representam (se fixa). */
function abaDaTelaEmpilhada(pathname: string): BottomNavTab | null | undefined {
  if (pathname === '/historico' || pathname.startsWith('/historico/')) return 'ciclo';
  // Detalhes pode ser aberto pela Home ou pelo Ciclo: mantém a aba de onde o usuário veio
  if (pathname === '/detalhes-da-tarefa') return null;
  return undefined; // tela sem nav-bar
}

export function NavBarGlobal() {
  const { perfil } = useSessao();
  const pathname = usePathname();
  const segments = useSegments();
  const [ultimaAba, setUltimaAba] = useState<BottomNavTab>('home');

  const abaDaRota = ABA_POR_ROTA[pathname];
  const estaNasAbas = segments[0] === '(tabs)';
  const abaEmpilhada = estaNasAbas ? null : abaDaTelaEmpilhada(pathname);

  // Lembra a última aba visitada (ajuste de estado durante o render, sem efeito)
  if (abaDaRota && abaDaRota !== ultimaAba) setUltimaAba(abaDaRota);

  const visivel = !!perfil && (estaNasAbas || abaEmpilhada !== undefined);
  if (!visivel) return null;

  const abaAtiva = abaDaRota ?? abaEmpilhada ?? ultimaAba;
  const inicialUsuario = (perfil.apelido || perfil.nome || 'M').trim().charAt(0).toUpperCase();

  const trocarAba = (tab: BottomNavTab) => {
    const rota = ROTA_DA_ABA[tab];
    if (!rota) {
      avisarAbaIndisponivel(tab);
      return;
    }
    if (estaNasAbas) {
      // Entre abas: só alterna a aba já montada
      if (tab !== abaAtiva) router.navigate(rota);
    } else {
      // De uma tela empilhada: fecha as telas por cima e volta para a aba
      router.dismissTo(rota);
    }
  };

  return <BottomNavBar activeTab={abaAtiva} onTabChange={trocarAba} userInitial={inicialUsuario} />;
}
