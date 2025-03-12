import express from 'express';
import bodyParser from 'body-parser';
import webhookRouter from './webhook.routes';
import './worker'; // so the worker runs

const app = express();
app.use(bodyParser.json());
app.use('/', webhookRouter); // routes

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
