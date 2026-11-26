// Loads server.js only after entry.mjs has set the bindings on globalThis.
module.exports = () => require('../server.js');
