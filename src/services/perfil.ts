/**
 * Edição dos dados do próprio usuário (tela "Meu perfil").
 */

import { FirebaseError } from 'firebase/app';
import { updateProfile, User, verifyBeforeUpdateEmail } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Atualiza o nome de cadastro (vale para todas as moradias) e o apelido da moradia atual. */
export async function atualizarNomeEApelido(
  usuario: User,
  moradiaId: string,
  dados: { nome: string; apelido: string },
): Promise<void> {
  const nome = dados.nome.trim();
  const apelido = dados.apelido.trim();

  if (nome.length < 2) {
    throw new Error('Informe seu nome completo.');
  }

  await setDoc(
    doc(db, 'usuarios', usuario.uid),
    { nome, atualizadoEm: serverTimestamp() },
    { merge: true },
  );
  await setDoc(doc(db, 'moradias', moradiaId, 'membros', usuario.uid), { apelido }, { merge: true });

  if (usuario.displayName !== nome) {
    await updateProfile(usuario, { displayName: nome });
  }
}

/**
 * Pede a troca de e-mail: o Firebase envia um link de confirmação para o novo endereço
 * e só troca o e-mail da conta depois que o link é aberto.
 */
export async function solicitarTrocaDeEmail(usuario: User, novoEmail: string): Promise<void> {
  const email = novoEmail.trim().toLowerCase();

  if (!EMAIL_VALIDO.test(email)) {
    throw new Error('Informe um e-mail válido.');
  }

  try {
    await verifyBeforeUpdateEmail(usuario, email);
  } catch (erro) {
    throw new Error(mensagemErroEmail(erro));
  }
}

function mensagemErroEmail(erro: unknown): string {
  const codigo = erro instanceof FirebaseError ? erro.code : '';
  switch (codigo) {
    case 'auth/requires-recent-login':
      return 'Por segurança, saia e entre novamente na conta antes de trocar o e-mail.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está sendo usado por outra conta.';
    case 'auth/invalid-email':
      return 'Informe um e-mail válido.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
    default:
      return 'Não foi possível enviar o link de confirmação do novo e-mail.';
  }
}
