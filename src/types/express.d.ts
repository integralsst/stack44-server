import { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface AuthenticatedUser {
      userId: string;
      email: string;
      role: Role;
      companyId: string | null;
      professionalId: string | null;
    }

    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};