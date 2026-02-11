import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './config/db.js';

const app = express();

await connectDB();

app.use(express.json());
app.use(cors());

app.get('/', (req, res)=> res.send('server is running'))

const PORT = process.env.PORT || 4000;

app.listen(PORT, ()=> console.log(`Server is running on port ${PORT}`))
