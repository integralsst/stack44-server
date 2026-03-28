// src/index.ts (Fragmento)
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes'; 
import companyRoutes from './routes/company.routes';
import userRoutes from './routes/user.routes'; // <-- 1. Importa las rutas

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/users', userRoutes); // <-- 2. Conecta las rutas al prefijo /api/users

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Servidor operativo y en línea 🚀' });
});

app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
