const express = require('express');

const app = express();
const PORT = 3000;

// The message is configurable: GREETING can be set at run time with
// `docker run -e GREETING="..."`. The fallback keeps the app working even if
// the variable is not set at all.
const GREETING = process.env.GREETING || 'Hello from my first Docker image!';

app.get('/', (req, res) => {
  res.send(`${GREETING}\n`);
});

// Bind on 0.0.0.0 so the server is reachable from outside the container,
// not only from inside it.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`App listening on port ${PORT}`);
  console.log(`GREETING = ${GREETING}`);
});
