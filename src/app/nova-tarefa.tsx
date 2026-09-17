import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import { auth } from '../firebaseConfig';
import { PerfilUsuario, carregarPerfil, ehAdministrador } from '../services/moradia';
import { cadastrarTarefa } from '../services/tarefas';
import {
  DIAS_SEMANA,
  DadosNovaTarefa,
  Frequencia,
  FrequenciaTipo,
  PESO_MAXIMO,
  PESO_MINIMO,
  ROTULOS_PESO,
  descreverFrequencia,
  formatarDataHora,
  paraInteiro,
  proximoSorteioElegivel,
  validarDadosTarefa,
} from '../types/tarefa';

const TIPOS: { valor: FrequenciaTipo; rotulo: string }[] = [
  { valor: 'diaria', rotulo: 'Diária' },
  { valor: 'semanal', rotulo: 'Semanal' },
  { valor: 'mensal', rotulo: 'Mensal' },
];

const PESOS = Array.from({ length: PESO_MAXIMO - PESO_MINIMO + 1 }, (_, i) => PESO_MINIMO + i);

export default function NovaTarefaScreen() {
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<FrequenciaTipo>('semanal');
  const [vezesPorDia, setVezesPorDia] = useState('1');
  const [diasSemana, setDiasSemana] = useState<number[]>([1]);
  const [diaDoMes, setDiaDoMes] = useState('1');
  const [peso, setPeso] = useState(3);
  const [usarPrazo, setUsarPrazo] = useState(false);
  const [prazoDias, setPrazoDias] = useState('3');
  const [usarJanela, setUsarJanela] = useState(false);
  const [janelaHoras, setJanelaHoras] = useState('24');

  useEffect(() => {
    const usuario = auth.currentUser;
    if (!usuario) {
      setCarregando(false);
      return;
    }
    carregarPerfil(usuario)
      .then(setPerfil)
      .catch(() => setPerfil(null))
      .finally(() => setCarregando(false));
  }, []);

  const dados = useMemo<DadosNovaTarefa>(() => {
    let frequencia: Frequencia;
    if (tipo === 'diaria') {
      frequencia = { tipo: 'diaria', parametros: { vezesPorDia: paraInteiro(vezesPorDia) } };
    } else if (tipo === 'semanal') {
      frequencia = { tipo: 'semanal', parametros: { diasSemana: [...diasSemana].sort((a, b) => a - b) } };
    } else {
      frequencia = { tipo: 'mensal', parametros: { diaDoMes: paraInteiro(diaDoMes) } };
    }

    return {
      nome,
      frequencia,
      pesoDificuldade: peso,
      prazoConclusaoDias: usarPrazo ? paraInteiro(prazoDias) : null,
      janelaAntecedenciaHoras: usarJanela ? paraInteiro(janelaHoras) : null,
    };
  }, [nome, tipo, vezesPorDia, diasSemana, diaDoMes, peso, usarPrazo, prazoDias, usarJanela, janelaHoras]);

  const erros = validarDadosTarefa(dados);
  const sorteio = proximoSorteioElegivel(dados.janelaAntecedenciaHoras);

  const alternarDia = (dia: number) => {
    setDiasSemana((atual) =>
      atual.includes(dia) ? atual.filter((d) => d !== dia) : [...atual, dia],
    );
  };

  const salvar = async () => {
    if (erros.length > 0) {
      Alert.alert('Revise o formulário', erros.join('\n'));
      return;
    }

    setSalvando(true);
    try {
      const confirmacao = await cadastrarTarefa(perfil, dados);
      // Volta para a lista assim que salva; o alerta é só um aviso, não uma etapa obrigatória.
      router.replace('/');
      Alert.alert(
        'Tarefa cadastrada',
        `"${confirmacao.nome}" entra no sorteio semanal de ${formatarDataHora(confirmacao.proximoSorteio)}.`,
      );
    } catch (erro: any) {
      Alert.alert('Não foi possível cadastrar', erro.message);
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color="#2f6f4e" />
      </View>
    );
  }

  if (!auth.currentUser) return <Redirect href="/login" />;

  // Pré-condição do RF4.
  if (!ehAdministrador(perfil)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.aviso}>
          <Text style={styles.avisoTitulo}>Cadastro restrito</Text>
          <Text style={styles.avisoTexto}>
            Só quem tem permissão de administrador na moradia pode cadastrar tarefas. Peça a um
            administrador para liberar seu acesso.
          </Text>
          <TouchableOpacity style={styles.botaoSecundario} onPress={() => router.replace('/')}>
            <Text style={styles.botaoSecundarioTexto}>Voltar para as tarefas</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.cabecalho}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.voltar}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.titulo}>Nova tarefa</Text>
          <View style={{ width: 64 }} />
        </View>

        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          <View style={styles.bloco}>
            <Text style={styles.rotulo}>Nome da tarefa</Text>
            <TextInput
              placeholder="Ex.: Lavar a louça do jantar"
              value={nome}
              onChangeText={setNome}
              style={styles.input}
              maxLength={80}
            />
          </View>

          <View style={styles.bloco}>
            <Text style={styles.rotulo}>Frequência</Text>
            <View style={styles.linhaChips}>
              {TIPOS.map((item) => (
                <TouchableOpacity
                  key={item.valor}
                  style={[styles.chip, tipo === item.valor && styles.chipAtivo]}
                  onPress={() => setTipo(item.valor)}
                >
                  <Text style={[styles.chipTexto, tipo === item.valor && styles.chipTextoAtivo]}>
                    {item.rotulo}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {tipo === 'diaria' && (
              <View style={styles.subBloco}>
                <Text style={styles.ajuda}>Quantas vezes por dia</Text>
                <TextInput
                  value={vezesPorDia}
                  onChangeText={setVezesPorDia}
                  style={[styles.input, styles.inputCurto]}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            )}

            {tipo === 'semanal' && (
              <View style={styles.subBloco}>
                <Text style={styles.ajuda}>Dias da semana</Text>
                <View style={styles.linhaChips}>
                  {DIAS_SEMANA.map((rotulo, indice) => {
                    const ativo = diasSemana.includes(indice);
                    return (
                      <TouchableOpacity
                        key={rotulo}
                        style={[styles.chipDia, ativo && styles.chipAtivo]}
                        onPress={() => alternarDia(indice)}
                      >
                        <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>{rotulo}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {tipo === 'mensal' && (
              <View style={styles.subBloco}>
                <Text style={styles.ajuda}>Dia do mês (1 a 31)</Text>
                <TextInput
                  value={diaDoMes}
                  onChangeText={setDiaDoMes}
                  style={[styles.input, styles.inputCurto]}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            )}
          </View>

          <View style={styles.bloco}>
            <Text style={styles.rotulo}>Peso de dificuldade</Text>
            <View style={styles.linhaChips}>
              {PESOS.map((valor) => (
                <TouchableOpacity
                  key={valor}
                  style={[styles.chipPeso, peso === valor && styles.chipAtivo]}
                  onPress={() => setPeso(valor)}
                >
                  <Text style={[styles.chipTexto, peso === valor && styles.chipTextoAtivo]}>{valor}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ajuda}>{ROTULOS_PESO[peso]} — usado para equilibrar o sorteio</Text>
          </View>

          <View style={styles.bloco}>
            <View style={styles.linhaSwitch}>
              <View style={styles.linhaSwitchTexto}>
                <Text style={styles.rotulo}>Prazo de conclusão</Text>
                <Text style={styles.ajuda}>Opcional. Dias para concluir depois do sorteio.</Text>
              </View>
              <Switch value={usarPrazo} onValueChange={setUsarPrazo} />
            </View>
            {usarPrazo && (
              <TextInput
                value={prazoDias}
                onChangeText={setPrazoDias}
                style={[styles.input, styles.inputCurto, styles.subBloco]}
                keyboardType="number-pad"
                maxLength={3}
              />
            )}
          </View>

          <View style={styles.bloco}>
            <View style={styles.linhaSwitch}>
              <View style={styles.linhaSwitchTexto}>
                <Text style={styles.rotulo}>Janela mínima de antecedência</Text>
                <Text style={styles.ajuda}>
                  Opcional. Horas entre o sorteio e a execução. Se não couber, a tarefa entra no
                  sorteio seguinte.
                </Text>
              </View>
              <Switch value={usarJanela} onValueChange={setUsarJanela} />
            </View>
            {usarJanela && (
              <TextInput
                value={janelaHoras}
                onChangeText={setJanelaHoras}
                style={[styles.input, styles.inputCurto, styles.subBloco]}
                keyboardType="number-pad"
                maxLength={3}
              />
            )}
          </View>

          <View style={styles.resumo}>
            <Text style={styles.resumoTitulo}>Como vai ficar</Text>
            <Text style={styles.resumoLinha}>{descreverFrequencia(dados.frequencia)}</Text>
            <Text style={styles.resumoLinha}>
              Peso {dados.pesoDificuldade} ({ROTULOS_PESO[dados.pesoDificuldade]})
            </Text>
            <Text style={styles.resumoLinha}>
              {dados.prazoConclusaoDias === null
                ? 'Sem prazo de conclusão'
                : `Prazo de ${dados.prazoConclusaoDias} dia(s)`}
            </Text>
            <Text style={styles.resumoLinha}>
              {dados.janelaAntecedenciaHoras === null
                ? 'Sem antecedência mínima'
                : `Antecedência mínima de ${dados.janelaAntecedenciaHoras} hora(s)`}
            </Text>
            <Text style={styles.resumoDestaque}>Entra no sorteio de {formatarDataHora(sorteio)}</Text>
          </View>

          {erros.length > 0 && nome.length > 0 && (
            <View style={styles.erros}>
              {erros.map((erro) => (
                <Text key={erro} style={styles.erroTexto}>
                  {erro}
                </Text>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.botao, (salvando || erros.length > 0) && styles.botaoDesativado]}
            onPress={salvar}
            disabled={salvando || erros.length > 0}
          >
            <Text style={styles.botaoTexto}>{salvando ? 'Cadastrando...' : 'Cadastrar tarefa'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f4' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f5f4' },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  voltar: { color: '#2f6f4e', fontSize: 15, width: 64 },
  titulo: { fontSize: 18, fontWeight: '700', color: '#1d2b24' },
  conteudo: { padding: 20, paddingBottom: 48 },
  bloco: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  subBloco: { marginTop: 12 },
  rotulo: { fontSize: 15, fontWeight: '600', color: '#1d2b24', marginBottom: 8 },
  ajuda: { fontSize: 13, color: '#6b7a72', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d8ded9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  inputCurto: { width: 90 },
  // marginRight/marginTop em vez de "gap" para funcionar em versões antigas do RN.
  linhaChips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: -8 },
  chip: {
    marginRight: 8,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d8ded9',
    backgroundColor: '#fff',
  },
  chipDia: {
    marginRight: 8,
    marginTop: 8,
    width: 46,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d8ded9',
    backgroundColor: '#fff',
  },
  chipPeso: {
    marginRight: 8,
    marginTop: 8,
    width: 46,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d8ded9',
    backgroundColor: '#fff',
  },
  chipAtivo: { backgroundColor: '#2f6f4e', borderColor: '#2f6f4e' },
  chipTexto: { fontSize: 14, color: '#3d4b44' },
  chipTextoAtivo: { color: '#fff', fontWeight: '600' },
  linhaSwitch: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  linhaSwitchTexto: { flex: 1, paddingRight: 12 },
  resumo: {
    backgroundColor: '#e8f1ec',
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
    marginBottom: 16,
  },
  resumoTitulo: { fontSize: 14, fontWeight: '700', color: '#1d2b24', marginBottom: 8 },
  resumoLinha: { fontSize: 14, color: '#3d4b44', marginBottom: 4 },
  resumoDestaque: { fontSize: 14, fontWeight: '600', color: '#2f6f4e', marginTop: 6 },
  erros: { marginBottom: 16 },
  erroTexto: { color: '#b3261e', fontSize: 13, marginBottom: 4 },
  botao: {
    backgroundColor: '#2f6f4e',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  botaoDesativado: { backgroundColor: '#a9bfb3' },
  botaoTexto: { color: '#fff', fontSize: 16, fontWeight: '600' },
  botaoSecundario: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#2f6f4e',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  botaoSecundarioTexto: { color: '#2f6f4e', fontSize: 15, fontWeight: '600' },
  aviso: { margin: 20, backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  avisoTitulo: { fontSize: 17, fontWeight: '700', color: '#1d2b24', marginBottom: 8 },
  avisoTexto: { fontSize: 14, color: '#6b7a72', lineHeight: 20 },
});
