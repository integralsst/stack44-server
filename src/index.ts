// src/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes'; 
import companyRoutes from './routes/company.routes'; // <-- Importa las nuevas rutas

dotenv.config();
    
const app = express();
const PORT = process.env.PORT || 4000;

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// --- CONEXIÓN DE RUTAS ---
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes); // <-- Conecta las rutas de empresas

// --- RUTA DE SALUD (Health Check) ---
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Servidor operativo y en línea 🚀' });
});

// --- ARRANCAR EL SERVIDOR ---
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});