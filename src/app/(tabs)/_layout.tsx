/**
 * Abas principais do app (Home, Ciclo e Perfil).
 *
 * As telas ficam montadas depois da primeira visita, então trocar de aba
 * é instantâneo, sem recarregar a tela nem animação de push.
 * A nav-bar não é desenhada aqui: ela é global (`NavBarGlobal`, no layout raiz)
 * para continuar fixa também nas telas empilhadas por cima das abas.
 */

import { Tabs } from 'expo-router';
import React from 'react';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, animation: 'none' }} tabBar={() => null}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="ciclo" />
      <Tabs.Screen name="ranking" />
      <Tabs.Screen name="perfil" />
    </Tabs>
  );
}
