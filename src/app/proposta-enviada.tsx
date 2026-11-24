import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TelaSucessoTroca } from '@/components/trocas/TrocasUI';
import { colors } from '@/constants/theme';
import { useSessao } from '@/contexts/SessaoContext';

export default function PropostaEnviadaScreen() {
  const insets = useSafeAreaInsets();
  const { usuario, perfil, carregando } = useSessao();
  const { origemNome, solicitadaNome } = useLocalSearchParams<{
    origemNome?: string;
    solicitadaNome?: string;
  }>();

  if (carregando) return <View style={styles.container} />;
  if (!usuario) return <Redirect href="/login" />;
  if (!perfil) return <Redirect href="/" />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TelaSucessoTroca
        titulo="Proposta Enviada!"
        subtitulo="Proposta enviada ao responsável oculto. Suas tarefas só mudam após o aceite."
        resumoTitulo="RESUMO DA PROPOSTA"
        labelMais="TAREFA SOLICITADA"
        valorMais={solicitadaNome || 'Tarefa solicitada'}
        labelMenos="SUA TAREFA OFERECIDA"
        valorMenos={origemNome || 'Sua tarefa'}
        onVoltar={() => router.dismissTo('/trocas')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
