import cors from 'cors';

export default cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://web:3000'],
  credentials: true,
});
