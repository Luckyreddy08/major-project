@echo off
title VoteChain Node 3001
cd /d "C:\Users\DELL\OneDrive\Desktop\VoteChain"

set PORT=3001
set PEERS=http://localhost:3000,http://localhost:3002

echo Starting Node 3001...
node index.js
pause
