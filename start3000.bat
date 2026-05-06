@echo off
title VoteChain Node 3000
cd /d "C:\Users\DELL\OneDrive\Desktop\VoteChain"

set PORT=3000
set PEERS=http://localhost:3001,http://localhost:3002

echo Starting Node 3000...
node index.js
pause
