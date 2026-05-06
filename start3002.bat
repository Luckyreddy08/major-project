@echo off
title VoteChain Node 3002
cd /d "C:\Users\DELL\OneDrive\Desktop\VoteChain"

set PORT=3002
set PEERS=http://localhost:3000,http://localhost:3001

echo Starting Node 3002...
node index.js
pause
