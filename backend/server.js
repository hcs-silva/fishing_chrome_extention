const app = require('./app');
const { validateConfig } = require('./config/config');

// Validate configuration before starting server
validateConfig();

const PORT = process.env.PORT || 5005;

app.listen(PORT, () => console.log(`API a correr na porta ${PORT}`));
