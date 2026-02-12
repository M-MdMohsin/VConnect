import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './config/db.js';
import { inngest,functions } from './ingest/index.js';

const app = express();

await connectDB();

app.use(express.json());
app.use(cors());

app.get('/', (req, res)=> res.send('server is running'))

app.use('/api/ingest', serve({client: inngest, functions}))   //Integrating ingest into project

const PORT = process.env.PORT || 4000;

app.listen(PORT, ()=> console.log(`Server is running on port ${PORT}`))
