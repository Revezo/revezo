/**
 * Abas principais do app (Home e Ciclo).
 *
 * As telas ficam montadas depois da primeira visita, então trocar de aba
 * pela nav-bar é instantâneo, sem recarregar a tela nem animação de push.
 */

import { BottomNavBar, BottomNavTab } from '@/components/navigation/BottomNavBar';
import { avisarAbaIndisponivel, ROTA_DA_ABA } from '@/components/navigation/navegacaoAbas';
import { useSessao } from '@/contexts/SessaoContext';
import { Tabs } from 'expo-router';
import React from 'react';

const ABA_POR_ROTA: Record<string, BottomNavTab> = {
  index: 'home',
  ciclo: 'ciclo',
};

export default function TabsLayout() {
  const { perfil } = useSessao();
  const inicialUsuario = (perfil?.apelido || perfil?.nome || 'M').trim().charAt(0).toUpperCase();

  return (
    <Tabs
      screenOptions={{ headerShown: false, animation: 'none' }}
      tabBar={({ state, navigateToTab }) => {
        const rotaAtiva = state.routes[state.index];

        // A nav-bar só aparece quando há moradia (a Home sem perfil é a tela de boas-vindas)
        if (!perfil) return null;

        return (
          <BottomNavBar
            activeTab={ABA_POR_ROTA[rotaAtiva.name] ?? 'home'}
            userInitial={inicialUsuario}
            onTabChange={(tab) => {
              if (!ROTA_DA_ABA[tab]) {
                avisarAbaIndisponivel(tab);
                return;
              }
              const destino = state.routes.find((r) => ABA_POR_ROTA[r.name] === tab);
              if (destino && destino.key !== rotaAtiva.key) navigateToTab(destino.key);
            }}
          />
        );
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="ciclo" />
    </Tabs>
  );
}
