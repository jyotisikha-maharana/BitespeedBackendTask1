import express, { Request, Response } from 'express';
import identifyRouter from './pages/identify';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Bitespeed Identity Reconciliation Backend');
});

app.use('/identify', identifyRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 