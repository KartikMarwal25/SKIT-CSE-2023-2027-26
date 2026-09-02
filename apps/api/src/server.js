import { createApp } from './app.js';
import { config } from './lib/config.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`SecureCred API listening on port ${config.port}`);
});
