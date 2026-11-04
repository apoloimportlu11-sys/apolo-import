// Script auxiliar para compilar el proyecto desde cPanel (Setup Node.js App -> "Ejecutar script JS")
// cuando no hay acceso a una Terminal/SSH para correr "npm run build" manualmente.
const { execFileSync } = require("child_process");

console.log("Iniciando build de producción (next build)...");
execFileSync("npm", ["run", "build"], { stdio: "inherit", cwd: __dirname });
console.log("Build completado.");
