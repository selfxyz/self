import express from 'express';
import type { Request, Response } from 'express';
import { createVerifier } from './verifier';

const app = express();
const port = 3010;

// Middleware to parse JSON bodies
app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Basic endpoint
app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'Hello from TypeScript server!' });
});

// POST endpoint example
app.post('/webhook', (req: Request, res: Response) => {
    console.log('Received webhook:', req.body);
    res.json({
        status: 'success',
        received: req.body
    });
});

// New verification endpoint
app.post('/verify2', async (req: Request, res: Response) => {
    console.log('Verify endpoint hit');
    try {
        const { proof, publicSignals } = req.body;
        console.log('Received proof:', proof);
        console.log('Received signals:', publicSignals);

        const verifier = createVerifier('YOUR_RPC_URL', 'test-scope');
        const result = await verifier.verify(proof, publicSignals);
        res.json(result);
    } catch (error) {
        console.error('Verification error:', error);
        res.status(400).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Verification failed'
        });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('Endpoints registered:');
    console.log('- GET /');
    console.log('- POST /verify');
});