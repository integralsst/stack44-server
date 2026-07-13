import {
  RolUsuario,
  TipoEvaluador,
} from "@prisma/client";

import { prisma } from "../lib/prisma";
import { esRolInterno } from "./access";

export function puedeGestionarMatriz(
  usuario: Express.UsuarioAutenticado
): boolean {
  return (
    esRolInterno(usuario.rol) ||
    usuario.rol === RolUsuario.PROFESIONAL
  );
}

export async function puedeAccederEmpresa(
  usuario: Express.UsuarioAutenticado,
  empresaId: string
): Promise<boolean> {
  if (esRolInterno(usuario.rol)) return true;

  if (usuario.empresaId === empresaId) {
    return true;
  }

  if (
    usuario.rol === RolUsuario.PROFESIONAL &&
    usuario.profesionalId
  ) {
    const asignacion =
      await prisma.empresaProfesional.findFirst({
        where: {
          empresaId,
          profesionalId: usuario.profesionalId,
          activo: true,
        },
        select: { id: true },
      });

    return Boolean(asignacion);
  }

  return false;
}

export async function puedeGestionarEmpresaSgsst(
  usuario: Express.UsuarioAutenticado,
  empresaId: string
): Promise<boolean> {
  if (!puedeGestionarMatriz(usuario)) {
    return false;
  }

  return puedeAccederEmpresa(usuario, empresaId);
}

export function resolverTipoEvaluador(
  usuario: Express.UsuarioAutenticado,
  solicitado?: TipoEvaluador
): TipoEvaluador {
  if (usuario.rol === RolUsuario.PROFESIONAL) {
    return TipoEvaluador.PROFESIONAL;
  }

  if (
    usuario.rol === RolUsuario.ADMIN_CLIENTE ||
    usuario.rol === RolUsuario.USUARIO_CLIENTE
  ) {
    return TipoEvaluador.EMPRESA;
  }

  if (esRolInterno(usuario.rol)) {
    if (solicitado === TipoEvaluador.AUDITOR) {
      return TipoEvaluador.AUDITOR;
    }

    if (solicitado === TipoEvaluador.PROFESIONAL) {
      return TipoEvaluador.PROFESIONAL;
    }

    return TipoEvaluador.ADMINISTRACION;
  }

  return TipoEvaluador.EMPRESA;
}

export function filtroEmpresasPorUsuario(
  usuario: Express.UsuarioAutenticado
) {
  if (esRolInterno(usuario.rol)) {
    return {};
  }

  if (
    usuario.rol === RolUsuario.PROFESIONAL &&
    usuario.profesionalId
  ) {
    return {
      asignacionesProfesionales: {
        some: {
          profesionalId: usuario.profesionalId,
          activo: true,
        },
      },
    };
  }

  if (usuario.empresaId) {
    return { id: usuario.empresaId };
  }

  return { id: "__SIN_ACCESO__" };
}
