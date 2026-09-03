#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "===================================="
echo " Starting AWMS Application..."
echo "===================================="

# Include standard Node/NVM/Homebrew paths in environment
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  export NVM_DIR="$HOME/.nvm"
  \. "$NVM_DIR/nvm.sh"
fi

# Open browser once server is ready
(sleep 3 && open "http://localhost:5173") &

# Run development servers
npm run dev
