const { spawn } = require('child_process');
const fs = require('fs');

console.log("Starting build debug...");
const child = spawn('npx.cmd', ['vite', 'build'], { shell: true });
const stream = fs.createWriteStream('debug_log.txt');

child.stdout.pipe(stream);
child.stderr.pipe(stream);

child.on('close', (code) => {
    console.log(`Build exited with code ${code}`);
});
