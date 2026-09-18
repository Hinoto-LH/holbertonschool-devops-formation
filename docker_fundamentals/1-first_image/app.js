const express = require('express');

const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.send('Hello from my first Docker image!\n');
});

// Bind on 0.0.0.0 so the server is reachable from outside the container,
// not only from inside it.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`App listening on port ${PORT}`);
});
