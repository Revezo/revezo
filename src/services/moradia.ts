import { User } from 'firebase/auth';
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

export type Papel = 'admin' | 'morador';

export interface PerfilUsuario {
  uid: string;
  email: string | null;
  nome: string;
  apelido?: string;
  moradiaId: string;
  moradiaNome: string;
  papel: Papel;
}

/** Pré-condição do RF4: só administradores cadastram tarefas. */
export function ehAdministrador(perfil: PerfilUsuario | null): boolean {
  return perfil?.papel === 'admin';
}

export async function carregarPerfil(usuario: User): Promise<PerfilUsuario | null> {
  const perfilSnap = await getDoc(doc(db, 'usuarios', usuario.uid));
  if (!perfilSnap.exists()) return null;

  const dados = perfilSnap.data();
  const moradiaId: string | undefined = dados.moradiaId;
  if (!moradiaId) return null;

  // O papel vale dentro da moradia, então a fonte da verdade é o documento de membro.
  const membroSnap = await getDoc(doc(db, 'moradias', moradiaId, 'membros', usuario.uid));
  const membroDados = membroSnap.exists() ? membroSnap.data() : null;
  const papel: Papel = (membroDados ? membroDados.papel : dados.papel) === 'admin'
    ? 'admin'
    : 'morador';

  const moradiaSnap = await getDoc(doc(db, 'moradias', moradiaId));

  // Nome a ser exibido:
  // Se o usuário inseriu um apelido específico para esta moradia, tem precedência.
  // Caso contrário, usa o nome que ele cadastrou no Firebase (dados.nome ou displayName).
  const apelidoMoradia = membroDados?.apelido?.trim();
  const nomeCadastrado = dados.nome?.trim() || usuario.displayName?.trim();
  const nomeFinal = (apelidoMoradia && apelidoMoradia.length > 0)
    ? apelidoMoradia
    : (nomeCadastrado || (usuario.email ? usuario.email.split('@')[0] : 'Morador'));

  return {
    uid: usuario.uid,
    email: usuario.email,
    nome: nomeFinal,
    apelido: apelidoMoradia || undefined,
    moradiaId,
    moradiaNome: moradiaSnap.exists() ? moradiaSnap.data().nome ?? 'Moradia' : 'Moradia',
    papel,
  };
}

function gerarStringAleatoria(tamanho: number) {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let resultado = '';
  for (let i = 0; i < tamanho; i++) {
    resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return resultado;
}

async function gerarCodigoConviteUnico(): Promise<string> {
  let codigoUnico = false;
  let codigo = '';

  while (!codigoUnico) {
    codigo = `MOR-${gerarStringAleatoria(4)}`;
    
    const moradiasRef = collection(db, 'moradias');
    const q = query(moradiasRef, where('codigoConvite', '==', codigo));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      codigoUnico = true; 
    }
  }

  return codigo;
}

/** Cria a moradia e torna quem criou o administrador dela. */
export async function criarMoradiaComoAdmin(
  usuario: User, 
  nomeMoradia: string, 
  endereco: string = '',
  apelido: string = ''
): Promise<{perfil: PerfilUsuario; codigoConvite: string}> {

  const nome = nomeMoradia.trim();
  if (nome.length < 3) {
    throw new Error('O nome da moradia precisa de pelo menos 3 caracteres.');
  }

  const codigoConvite = await gerarCodigoConviteUnico();

  const moradiaRef = await addDoc(collection(db, 'moradias'), {
    nome,
    endereco: endereco.trim(),
    codigoConvite,
    criadaPor: usuario.uid,
    criadaEm: serverTimestamp(),
    membrosIds: [usuario.uid],
  });

  // Busca o nome de cadastro prévio para fallback
  let nomeCadastrado = '';
  const usuarioSnap = await getDoc(doc(db, 'usuarios', usuario.uid));
  if (usuarioSnap.exists() && usuarioSnap.data().nome) {
    nomeCadastrado = usuarioSnap.data().nome;
  }
  const nomePadrao = nomeCadastrado || usuario.displayName?.trim() || (usuario.email?.split('@')[0] ?? 'Morador');
  const apelidoInformado = apelido.trim();
  const nomeUsuario = apelidoInformado || nomePadrao;

  await setDoc(doc(db, 'moradias', moradiaRef.id, 'membros', usuario.uid), {
    papel: 'admin',
    apelido: apelidoInformado,
    email: usuario.email ?? null,
    entrouEm: serverTimestamp(),
  });

  await setDoc(
    doc(db, 'usuarios', usuario.uid),
    {
      email: usuario.email ?? null,
      nome: nomeCadastrado || nomeUsuario,
      moradiaId: moradiaRef.id,
      papel: 'admin',
      atualizadoEm: serverTimestamp(),
    },
    { merge: true },
  );

  const perfil: PerfilUsuario = {
    uid: usuario.uid,
    email: usuario.email,
    nome: nomeUsuario,
    apelido: apelidoInformado || undefined,
    moradiaId: moradiaRef.id,
    moradiaNome: nome,
    papel: 'admin',
  };

  return { perfil, codigoConvite };
}

/** Entra em uma moradia existente através do código de convite como morador (não-admin). */
export async function entrarMoradiaComCodigo(
  usuario: User,
  codigoConvite: string,
  apelido: string = ''
): Promise<{ perfil: PerfilUsuario }> {
  const codigoFormatado = codigoConvite.trim().toUpperCase();
  if (!codigoFormatado) {
    throw new Error('Código inválido. Verifique o código e tente novamente.');
  }

  const moradiasRef = collection(db, 'moradias');
  const q = query(moradiasRef, where('codigoConvite', '==', codigoFormatado));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error('Código inválido. Verifique o código e tente novamente.');
  }

  const moradiaDoc = querySnapshot.docs[0];
  const moradiaId = moradiaDoc.id;
  const dadosMoradia = moradiaDoc.data();

  // Papel do usuário ao entrar por código: morador (a não ser que ele seja o criador original da moradia)
  const ehCriador = dadosMoradia.criadaPor === usuario.uid;
  const papel: Papel = ehCriador ? 'admin' : 'morador';

  const apelidoInformado = apelido.trim();
  let nomeCadastrado = '';
  const usuarioSnap = await getDoc(doc(db, 'usuarios', usuario.uid));
  if (usuarioSnap.exists() && usuarioSnap.data().nome) {
    nomeCadastrado = usuarioSnap.data().nome;
  }
  const nomePadrao = nomeCadastrado || usuario.displayName?.trim() || (usuario.email?.split('@')[0] ?? 'Morador');
  const nomeUsuario = apelidoInformado || nomePadrao;

  // 1. Garante que o UID do usuário esteja na lista membrosIds da moradia
  await updateDoc(doc(db, 'moradias', moradiaId), {
    membrosIds: arrayUnion(usuario.uid),
  });

  // 2. Registra o membro na subcoleção de membros
  await setDoc(
    doc(db, 'moradias', moradiaId, 'membros', usuario.uid),
    {
      papel,
      apelido: apelidoInformado,
      email: usuario.email ?? null,
      entrouEm: serverTimestamp(),
    },
    { merge: true },
  );

  // 3. Atualiza o perfil e moradia ativa do usuário
  await setDoc(
    doc(db, 'usuarios', usuario.uid),
    {
      email: usuario.email ?? null,
      nome: nomeCadastrado || nomeUsuario,
      moradiaId,
      papel,
      atualizadoEm: serverTimestamp(),
    },
    { merge: true },
  );

  const perfil: PerfilUsuario = {
    uid: usuario.uid,
    email: usuario.email,
    nome: nomeUsuario,
    apelido: apelidoInformado || undefined,
    moradiaId,
    moradiaNome: dadosMoradia.nome ?? 'Moradia',
    papel,
  };

  return { perfil };
}

export interface MoradiaResumo {
  id: string;
  nome: string;
  endereco: string;
  papel: Papel;
  totalMoradores: number;
}

export async function buscarMinhasMoradias(uid: string) {
  const q = query(collection(db, 'moradias'), where('membrosIds', 'array-contains', uid));
  const snapshot = await getDocs(q);

  const administra: MoradiaResumo[] = [];
  const participa: MoradiaResumo[] = [];

  snapshot.forEach((docSnap) => {
    const dados = docSnap.data();
    const papel = dados.criadaPor === uid ? 'admin' : 'morador';
    
    const resumo: MoradiaResumo = {
      id: docSnap.id,
      nome: dados.nome,
      endereco: dados.endereco || '',
      papel: papel,
      totalMoradores: dados.membrosIds?.length || 1, 
    };

    if (papel === 'admin') {
      administra.push(resumo);
    } else {
      participa.push(resumo);
    }
  });

  return { administra, participa };
}

export async function alterarMoradiaAtiva(uid: string, moradiaId: string) {
  const membroSnap = await getDoc(doc(db, 'moradias', moradiaId, 'membros', uid));
  const papel: Papel = (membroSnap.exists() && membroSnap.data().papel === 'admin') ? 'admin' : 'morador';

  await setDoc(
    doc(db, 'usuarios', uid), 
    { 
      moradiaId: moradiaId,
      papel,
      atualizadoEm: serverTimestamp() 
    }, 
    { merge: true }
  );
}

export async function buscarMoradiaPorId(
  moradiaId: string,
): Promise<{ id: string; nome: string; endereco?: string } | null> {
  const snap = await getDoc(doc(db, 'moradias', moradiaId));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    id: snap.id,
    nome: d.nome ?? 'Moradia',
    endereco: d.endereco || '',
  };
}
