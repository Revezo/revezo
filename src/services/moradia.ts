import { User } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export type Papel = 'admin' | 'morador';

export interface PerfilUsuario {
  uid: string;
  email: string | null;
  nome: string;
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
  const papel: Papel = (membroSnap.exists() ? membroSnap.data().papel : dados.papel) === 'admin'
    ? 'admin'
    : 'morador';

  const moradiaSnap = await getDoc(doc(db, 'moradias', moradiaId));

  return {
    uid: usuario.uid,
    email: usuario.email,
    nome: dados.nome ?? usuario.email?.split('@')[0] ?? 'Morador',
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
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
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
  });

  const nomeUsuario = apelido.trim() || (usuario.email?.split('@')[0] ?? 'Morador');

  await setDoc(doc(db, 'moradias', moradiaRef.id, 'membros', usuario.uid), {
    papel: 'admin',
    apelido: nomeUsuario,
    email: usuario.email ?? null,
    entrouEm: serverTimestamp(),
  });

  // const nomeUsuario = usuario.email?.split('@')[0] ?? 'Morador';

  await setDoc(
    doc(db, 'usuarios', usuario.uid),
    {
      email: usuario.email ?? null,
      nome: nomeUsuario,
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
    moradiaId: moradiaRef.id,
    moradiaNome: nome,
    papel: 'admin',
  };

  return { perfil, codigoConvite };
}