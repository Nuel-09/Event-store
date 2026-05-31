import express from 'express';
import { recoverIndex } from './store.js';
import router from './routes.js';

const PORT = process.env.PORT || 3100;

const app = express();
app.use(express.json());
app.use(router);

// Recover the in-memory index from events.log before accepting any requests.
await recoverIndex();

app.listen(PORT, () => {
  console.log(`Event store listening on http://localhost:${PORT}`);
});
